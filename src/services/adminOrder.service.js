/**
 * Service dédié aux opérations de commande par l'administrateur (AdminOrderService).
 * Gestion des statuts de consultation (non lues/déjà vues) et de l'attribution des livreurs.
 */

const Order = require('../models/order.model');
const User = require('../models/user.model');
const AuditLog = require('../models/auditLog.model');
const notificationService = require('./notification.service');
const { DriverStatus, OrderStatus, ErrorCodes } = require('../constants/enums');

class AdminOrderService {
  /**
   * Marque une commande comme consultée (déjà vue) par l'administrateur.
   */
  async markOrderAsViewed(orderId, adminId, socketEmitter = null) {
    const order = await Order.findById(orderId).populate('driverId', 'firstName lastName phone');
    if (!order) {
      const error = new Error('Commande introuvable.');
      error.statusCode = 404;
      error.code = ErrorCodes.ORDER_NOT_FOUND;
      throw error;
    }

    if (!order.isViewedByAdmin) {
      order.isViewedByAdmin = true;
      await order.save();

      const unviewedCount = await this.getUnviewedCount();

      if (socketEmitter) {
        socketEmitter.emitToAdmin('order:viewed', {
          orderId: order._id,
          unviewedCount
        });
      }

      return { order, unviewedCount };
    }

    const unviewedCount = await this.getUnviewedCount();
    return { order, unviewedCount };
  }

  /**
   * Marque toutes les commandes actives comme déjà vues.
   */
  async markAllOrdersAsViewed(adminId, socketEmitter = null) {
    await Order.updateMany(
      { isViewedByAdmin: false },
      { $set: { isViewedByAdmin: true } }
    );

    if (socketEmitter) {
      socketEmitter.emitToAdmin('orders:all-viewed', { unviewedCount: 0 });
    }

    return { success: true, unviewedCount: 0 };
  }

  /**
   * Assigne ou réassigne un livreur en ligne à une commande.
   */
  async assignDriverToOrder(orderId, driverId, adminId, socketEmitter = null) {
    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error('Commande introuvable.');
      error.statusCode = 404;
      error.code = ErrorCodes.ORDER_NOT_FOUND;
      throw error;
    }

    if ([OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(order.status)) {
      const error = new Error('Impossible d\'assigner un livreur à une commande terminée ou annulée.');
      error.statusCode = 400;
      error.code = ErrorCodes.INVALID_ORDER_STATUS;
      throw error;
    }

    const driver = await User.findOne({
      _id: driverId,
      role: 'DRIVER',
      isActive: true
    });

    if (!driver) {
      const error = new Error('Livreur introuvable ou compte inactif.');
      error.statusCode = 404;
      error.code = ErrorCodes.NOT_FOUND;
      throw error;
    }

    if (driver.driverStatus === DriverStatus.OFFLINE) {
      const error = new Error('Le livreur sélectionné est actuellement hors ligne.');
      error.statusCode = 400;
      error.code = ErrorCodes.DRIVER_NOT_AVAILABLE;
      throw error;
    }

    const previousDriverId = order.driverId;
    order.driverId = driver._id;

    // Progression naturelle de l'état : si la commande est reçue/en préparation, elle devient prête pour récupération
    const isEarlyStatus = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING].includes(order.status);
    if (isEarlyStatus) {
      order.status = OrderStatus.READY_FOR_PICKUP;
    }

    order.statusHistory.push({
      status: order.status,
      changedBy: `ADMIN:${adminId}`,
      changedAt: new Date(),
      note: `Livreur ${driver.firstName} ${driver.lastName} assigné par l'administration`
    });

    await order.save();
    await order.populate('driverId', 'firstName lastName phone');

    // Journal d'audit
    await AuditLog.create({
      action: 'DRIVER_ASSIGNED',
      actorId: adminId,
      actorRole: 'ADMIN',
      targetModel: 'Order',
      targetId: order._id,
      details: {
        orderNumber: order.orderNumber,
        driverId: driver._id,
        driverName: `${driver.firstName} ${driver.lastName}`,
        previousDriverId,
        newStatus: order.status
      }
    });

    // Synchronisation en direct
    if (socketEmitter) {
      const statusPayload = {
        orderId: order._id,
        orderNumber: order.orderNumber,
        trackingToken: order.trackingToken,
        status: order.status,
        statusHistory: order.statusHistory,
        driver: {
          _id: driver._id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          phone: driver.phone
        }
      };

      // 1. Informer le client en temps réel
      socketEmitter.emitToOrder(order.trackingToken, 'order:status-changed', statusPayload);
      socketEmitter.emitGlobal('order:status-changed', statusPayload);

      // 2. Informer l'administration
      socketEmitter.emitToAdmin('order:updated', order);

      // 3. Informer les livreurs
      socketEmitter.emitToDrivers('order:ready_for_pickup', order);
      socketEmitter.emitToDrivers('order:available', order);
      socketEmitter.emitToDriver(driver._id.toString(), 'order:assigned_to_me', order);
    }

    // Notifications Push
    notificationService.notifyCustomerByTrackingToken(order.trackingToken, {
      title: 'Livreur assigné !',
      body: `${driver.firstName} a été assigné(e) à votre commande #${order.orderNumber}.`,
      data: { orderId: order._id.toString(), status: order.status }
    }).catch(() => {});

    notificationService.notifyDrivers({
      title: `Nouvelle course #${order.orderNumber} !`,
      body: `Course attribuée par le restaurant Chez Roger Becker.`,
      data: { orderId: order._id.toString(), type: 'ORDER_ASSIGNED' },
      url: '/driver',
      driverId: driver._id.toString()
    }).catch(() => {});

    return order;
  }

  /**
   * Récupère le nombre total de commandes non lues par l'administrateur.
   */
  async getUnviewedCount() {
    return Order.countDocuments({
      isViewedByAdmin: false,
      status: { $ne: OrderStatus.CANCELLED }
    });
  }
}

module.exports = new AdminOrderService();
