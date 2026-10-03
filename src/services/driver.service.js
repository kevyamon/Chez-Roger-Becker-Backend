/**
 * Service de gestion des activités opérationnelles des livreurs (DriverService).
 * Règle Forteresse : Verrouillage strict (1 livraison active par livreur), validation du code PIN anti-litige.
 */

const User = require('../models/user.model');
const Order = require('../models/order.model');
const notificationService = require('./notification.service');
const driverProfileService = require('./driverProfile.service');
const { DriverStatus, OrderStatus, ErrorCodes } = require('../constants/enums');

class DriverService {
  async updateStatus(driverId, newStatus, socketEmitter = null) {
    if (newStatus === DriverStatus.AVAILABLE) {
      const activeCount = await Order.countDocuments({
        driverId,
        status: { $in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY] }
      });
      if (activeCount > 0) newStatus = DriverStatus.BUSY;
    }

    const driver = await User.findOneAndUpdate(
      { _id: driverId, role: 'DRIVER', isActive: true },
      { driverStatus: newStatus },
      { new: true }
    );

    if (!driver) {
      const error = new Error('Livreur introuvable ou désactivé.');
      error.statusCode = 404;
      error.code = ErrorCodes.NOT_FOUND;
      throw error;
    }

    if (socketEmitter) {
      socketEmitter.emitToAdmin('driver:status-changed', { driverId: driver._id, status: newStatus });
    }
    return driver;
  }

  async getAvailableOrders(driverId = null) {
    const query = { status: OrderStatus.READY_FOR_PICKUP };
    if (driverId) query.$or = [{ driverId: null }, { driverId }];
    else query.driverId = null;
    return Order.find(query).sort({ createdAt: 1 }).lean();
  }

  async acceptOrder(orderId, driverId, socketEmitter = null) {
    const driver = await User.findById(driverId);
    if (!driver || driver.driverStatus === DriverStatus.OFFLINE) {
      const error = new Error('Vous devez être connecté et disponible pour accepter une course.');
      error.statusCode = 400;
      error.code = ErrorCodes.DRIVER_NOT_AVAILABLE;
      throw error;
    }

    // Verrouillage strict : une seule course active à la fois
    const activeCount = await Order.countDocuments({
      driverId,
      status: { $in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY] }
    });

    if (activeCount > 0) {
      const error = new Error('Vous avez déjà une course active en cours. Vous devez la livrer avant d\'en accepter une autre.');
      error.statusCode = 400;
      error.code = ErrorCodes.DRIVER_NOT_AVAILABLE;
      throw error;
    }

    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: OrderStatus.READY_FOR_PICKUP,
        $or: [{ driverId: null }, { driverId }]
      },
      {
        $set: { status: OrderStatus.ASSIGNED, driverId },
        $push: {
          statusHistory: {
            status: OrderStatus.ASSIGNED,
            changedBy: `DRIVER:${driverId}`,
            changedAt: new Date(),
            note: `Course acceptée par ${driver.firstName} ${driver.lastName}`
          }
        }
      },
      { new: true }
    );

    if (!order) {
      const error = new Error('Cette commande a déjà été assignée à un autre livreur.');
      error.statusCode = 409;
      error.code = ErrorCodes.ORDER_ALREADY_ASSIGNED;
      throw error;
    }

    driver.driverStatus = DriverStatus.BUSY;
    await driver.save();

    if (socketEmitter) {
      socketEmitter.emitToOrder(order.trackingToken, 'order:status-changed', {
        orderId: order._id,
        status: OrderStatus.ASSIGNED,
        driver: { firstName: driver.firstName, lastName: driver.lastName, phone: driver.phone }
      });
      socketEmitter.emitToAdmin('order:updated', order);
      socketEmitter.emitToAdmin('driver:status-changed', { driverId: driver._id, status: DriverStatus.BUSY });
      socketEmitter.emitToDrivers('order:taken', { orderId });
    }

    notificationService.notifyCustomerByTrackingToken(order.trackingToken, {
      title: 'Livreur assigné !',
      body: `${driver.firstName} a pris en charge votre commande et se rend au restaurant.`,
      data: { orderId: order._id.toString(), status: OrderStatus.ASSIGNED }
    }).catch(() => {});

    return order;
  }

  async confirmPickup(orderId, driverId, socketEmitter = null) {
    const order = await Order.findOneAndUpdate(
      { _id: orderId, driverId, status: OrderStatus.ASSIGNED },
      {
        $set: { status: OrderStatus.PICKED_UP },
        $push: {
          statusHistory: {
            status: OrderStatus.PICKED_UP,
            changedBy: `DRIVER:${driverId}`,
            changedAt: new Date(),
            note: 'Repas récupéré en cuisine par le livreur'
          }
        }
      },
      { new: true }
    );

    if (!order) {
      const error = new Error('Impossible de valider la récupération de cette commande.');
      error.statusCode = 400;
      error.code = ErrorCodes.INVALID_ORDER_STATUS;
      throw error;
    }

    if (socketEmitter) {
      socketEmitter.emitToOrder(order.trackingToken, 'order:status-changed', {
        orderId: order._id,
        status: OrderStatus.PICKED_UP
      });
      socketEmitter.emitToAdmin('order:updated', order);
    }

    notificationService.notifyCustomerByTrackingToken(order.trackingToken, {
      title: 'Repas prêt et récupéré !',
      body: `Le livreur a récupéré votre commande #${order.orderNumber} en cuisine.`,
      data: { orderId: order._id.toString(), status: OrderStatus.PICKED_UP }
    }).catch(() => {});

    return order;
  }

  async startDelivery(orderId, driverId, socketEmitter = null) {
    const order = await Order.findOneAndUpdate(
      { _id: orderId, driverId, status: OrderStatus.PICKED_UP },
      {
        $set: { status: OrderStatus.OUT_FOR_DELIVERY },
        $push: {
          statusHistory: {
            status: OrderStatus.OUT_FOR_DELIVERY,
            changedBy: `DRIVER:${driverId}`,
            changedAt: new Date(),
            note: 'Livreur en route vers le client'
          }
        }
      },
      { new: true }
    );

    if (!order) {
      const error = new Error('Impossible de démarrer la livraison.');
      error.statusCode = 400;
      error.code = ErrorCodes.INVALID_ORDER_STATUS;
      throw error;
    }

    if (socketEmitter) {
      socketEmitter.emitToOrder(order.trackingToken, 'order:status-changed', {
        orderId: order._id,
        status: OrderStatus.OUT_FOR_DELIVERY
      });
      socketEmitter.emitToAdmin('order:updated', order);
    }

    notificationService.notifyCustomerByTrackingToken(order.trackingToken, {
      title: 'Livreur en route vers chez vous !',
      body: `Votre commande #${order.orderNumber} est en cours d'acheminement.`,
      data: { orderId: order._id.toString(), status: OrderStatus.OUT_FOR_DELIVERY }
    }).catch(() => {});

    return order;
  }

  async confirmDelivered(orderId, driverId, deliveryPin, socketEmitter = null) {
    const order = await Order.findOne({
      _id: orderId,
      driverId,
      status: OrderStatus.OUT_FOR_DELIVERY
    });

    if (!order) {
      const error = new Error('Impossible de confirmer la livraison. La commande doit être en cours d\'acheminement.');
      error.statusCode = 400;
      error.code = ErrorCodes.INVALID_ORDER_STATUS;
      throw error;
    }

    const providedPin = (deliveryPin || '').toString().trim();
    if (!providedPin || providedPin !== order.deliveryPin) {
      const error = new Error('Code PIN de livraison incorrect. Veuillez demander le code à 4 chiffres affiché sur le téléphone du client.');
      error.statusCode = 400;
      error.code = ErrorCodes.VALIDATION_ERROR;
      throw error;
    }

    order.status = OrderStatus.DELIVERED;
    order.payment.status = 'PAID';
    order.statusHistory.push({
      status: OrderStatus.DELIVERED,
      changedBy: `DRIVER:${driverId}`,
      changedAt: new Date(),
      note: 'Commande remise avec succès au client (Code PIN validé)'
    });

    await order.save();

    const driver = await User.findByIdAndUpdate(
      driverId,
      { driverStatus: DriverStatus.AVAILABLE },
      { new: true }
    );

    if (socketEmitter) {
      socketEmitter.emitToOrder(order.trackingToken, 'order:status-changed', {
        orderId: order._id,
        status: OrderStatus.DELIVERED
      });
      socketEmitter.emitToAdmin('order:updated', order);
      if (driver) {
        socketEmitter.emitToAdmin('driver:status-changed', {
          driverId: driver._id,
          status: DriverStatus.AVAILABLE
        });
      }
    }

    const driverName = driver ? `${driver.firstName} ${driver.lastName}` : 'Le livreur';

    notificationService.notifyCustomerByTrackingToken(order.trackingToken, {
      title: 'Commande livrée !',
      body: `Votre commande #${order.orderNumber} a été livrée avec succès. Bon appétit !`,
      data: { orderId: order._id.toString(), status: OrderStatus.DELIVERED }
    }).catch(() => {});

    notificationService.notifyAdmins({
      title: `Commande #${order.orderNumber} livrée !`,
      body: `Remise au client par ${driverName} (Montant encaissé : ${order.total} FCFA).`,
      data: { orderId: order._id.toString(), type: 'ORDER_DELIVERED' },
      url: '/admin'
    }).catch(() => {});

    return order;
  }

  async getActiveDeliveries(driverId) {
    return Order.find({
      driverId,
      status: { $in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY] }
    }).sort({ createdAt: -1 }).lean();
  }

  async getDriverHistory(driverId, { page = 1, limit = 20 }) {
    const skip = (Number(page) - 1) * Number(limit);
    const query = { driverId, status: OrderStatus.DELIVERED };
    const [orders, total] = await Promise.all([
      Order.find(query).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Order.countDocuments(query)
    ]);
    return { orders, total, page, limit };
  }

  getDriverStats(driverId) {
    return driverProfileService.getDriverStats(driverId);
  }

  updateProfile(driverId, payload) {
    return driverProfileService.updateProfile(driverId, payload);
  }

  changePassword(driverId, payload) {
    return driverProfileService.changePassword(driverId, payload);
  }
}

module.exports = new DriverService();
