/**
 * Service central de gestion des commandes (OrderService).
 * Applique la logique Forteresse : recalcul total cote serveur, verification de disponibilite et gestion d'etat.
 */

const Order = require('../models/order.model');
const Dish = require('../models/dish.model');
const RestaurantSettings = require('../models/restaurantSettings.model');
const AuditLog = require('../models/auditLog.model');
const { generateTrackingToken, generateOrderNumber } = require('../utils/tokenGenerator');
const { checkIsRestaurantOpen } = require('../utils/scheduleHelper');
const { OrderStatus, AllowedOrderTransitions, ErrorCodes } = require('../constants/enums');

class OrderService {
  /**
   * Creation securisee d'une nouvelle commande client.
   */
  async createOrder(orderPayload, socketEmitter = null) {
    // 1. Verification du statut et des horaires d'ouverture du restaurant
    const settings = await RestaurantSettings.getSettings();
    const status = checkIsRestaurantOpen(settings);
    if (!status.isOpen) {
      const error = new Error(settings.closedMessage || status.reason || 'Le restaurant est actuellement fermé.');
      error.statusCode = 400;
      error.code = ErrorCodes.RESTAURANT_CLOSED;
      throw error;
    }

    // 2. Chargement des plats depuis la base de donnees
    const dishIds = orderPayload.items.map((i) => i.dishId);
    const dishes = await Dish.find({ _id: { $in: dishIds } }).lean();
    const dishMap = new Map(dishes.map((d) => [d._id.toString(), d]));

    // 3. Verification de l'existence et disponibilite des plats + Recalcul des montants
    let subtotal = 0;
    const verifiedItems = [];

    for (const item of orderPayload.items) {
      const dish = dishMap.get(item.dishId);
      if (!dish) {
        const error = new Error(`Le plat selectionne n existe plus.`);
        error.statusCode = 404;
        error.code = ErrorCodes.DISH_UNAVAILABLE;
        throw error;
      }
      if (!dish.isAvailable) {
        const error = new Error(`Le plat "${dish.name}" est actuellement epuise.`);
        error.statusCode = 400;
        error.code = ErrorCodes.DISH_UNAVAILABLE;
        throw error;
      }

      const unitPrice = dish.promotionalPrice && dish.promotionalPrice < dish.price 
        ? dish.promotionalPrice 
        : dish.price;
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      verifiedItems.push({
        dishId: dish._id,
        name: dish.name,
        quantity: item.quantity,
        unitPrice,
        subtotal: itemSubtotal,
        selectedOptions: item.selectedOptions || []
      });
    }

    const deliveryFee = settings.deliveryFee || 1000;
    const total = subtotal + deliveryFee;

    // 4. Generation d'identifiants uniques et securises
    const orderNumber = generateOrderNumber();
    const trackingToken = generateTrackingToken();

    // 5. Persistance en base de donnees
    const order = await Order.create({
      orderNumber,
      trackingToken,
      customer: orderPayload.customer,
      items: verifiedItems,
      subtotal,
      deliveryFee,
      total,
      delivery: orderPayload.delivery,
      status: OrderStatus.PENDING,
      payment: {
        method: orderPayload.paymentMethod || 'CASH_ON_DELIVERY',
        status: 'PENDING'
      },
      statusHistory: [
        {
          status: OrderStatus.PENDING,
          changedBy: 'CUSTOMER',
          changedAt: new Date(),
          note: 'Commande recue par le restaurant'
        }
      ]
    });

    // 6. Notification en temps reel
    if (socketEmitter) {
      socketEmitter.emitToAdmin('order:created', order);
    }

    return order;
  }

  /**
   * Suivi public d'une commande via son trackingToken unique ou son numéro de commande (ex: RB-XXXXXX).
   */
  async trackOrderByToken(identifier) {
    const cleanId = (identifier || '').trim();
    const order = await Order.findOne({
      $or: [
        { trackingToken: cleanId },
        { orderNumber: cleanId.toUpperCase() }
      ]
    })
      .select('-customer.phone') // Masquage partiel sécurisé
      .populate('driverId', 'firstName lastName phone')
      .lean();

    if (!order) {
      const error = new Error('Commande introuvable avec ce numéro ou lien de suivi.');
      error.statusCode = 404;
      error.code = ErrorCodes.ORDER_NOT_FOUND;
      throw error;
    }
    return order;
  }

  /**
   * Transition d'etat controlee par la machine a etats.
   */
  async updateOrderStatus(orderId, newStatus, actorId, actorRole, note = '', socketEmitter = null) {
    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error('Commande introuvable.');
      error.statusCode = 404;
      error.code = ErrorCodes.ORDER_NOT_FOUND;
      throw error;
    }

    const currentStatus = order.status;
    const allowedNext = AllowedOrderTransitions[currentStatus] || [];

    if (!allowedNext.includes(newStatus)) {
      const error = new Error(`Transition interdite de ${currentStatus} vers ${newStatus}.`);
      error.statusCode = 400;
      error.code = ErrorCodes.INVALID_ORDER_STATUS;
      throw error;
    }

    order.status = newStatus;
    order.statusHistory.push({
      status: newStatus,
      changedBy: `${actorRole}:${actorId}`,
      changedAt: new Date(),
      note
    });

    await order.save();

    await AuditLog.create({
      action: 'ORDER_STATUS_CHANGED',
      actorId,
      actorRole,
      targetModel: 'Order',
      targetId: orderId,
      details: { previousStatus: currentStatus, newStatus, note }
    });

    if (socketEmitter) {
      const statusPayload = {
        orderId: order._id,
        orderNumber: order.orderNumber,
        trackingToken: order.trackingToken,
        status: newStatus,
        statusHistory: order.statusHistory,
        driver: order.driverId
      };
      socketEmitter.emitToOrder(order.trackingToken, 'order:status-changed', statusPayload);
      socketEmitter.emitGlobal('order:status-changed', statusPayload);
      socketEmitter.emitToAdmin('order:updated', order);
      if (newStatus === OrderStatus.READY_FOR_PICKUP) {
        socketEmitter.emitToDrivers('order:available', order);
      }
    }

    return order;
  }

  /**
   * Recuperation des commandes avec pagination et filtres pour l'administration.
   */
  async getAdminOrders({ status, driverId, search, date, page = 1, limit = 20 }) {
    const query = {};
    if (status) query.status = status;
    if (driverId) query.driverId = driverId;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search.trim(), $options: 'i' } },
        { 'customer.name': { $regex: search.trim(), $options: 'i' } },
        { 'customer.phone': { $regex: search.trim(), $options: 'i' } }
      ];
    }
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('driverId', 'firstName lastName phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(query)
    ]);

    return { orders, total, page, limit };
  }
}

module.exports = new OrderService();
