/**
 * Service de gestion des activités des livreurs (DriverService).
 * Gère la disponibilité, l'attribution atomique anti-concurrence et le cycle de livraison avec push.
 */

const User = require('../models/user.model');
const Order = require('../models/order.model');
const AuditLog = require('../models/auditLog.model');
const notificationService = require('./notification.service');
const { DriverStatus, OrderStatus, ErrorCodes } = require('../constants/enums');

class DriverService {
  async updateStatus(driverId, newStatus, socketEmitter = null) {
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

  async getAvailableOrders() {
    return Order.find({ status: OrderStatus.READY_FOR_PICKUP, driverId: null })
      .sort({ createdAt: 1 })
      .lean();
  }

  async acceptOrder(orderId, driverId, socketEmitter = null) {
    const driver = await User.findById(driverId);
    if (!driver || driver.driverStatus === DriverStatus.OFFLINE) {
      const error = new Error('Vous devez être connecté et disponible pour accepter une course.');
      error.statusCode = 400;
      error.code = ErrorCodes.DRIVER_NOT_AVAILABLE;
      throw error;
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: OrderStatus.READY_FOR_PICKUP, driverId: null },
      {
        $set: { status: OrderStatus.ASSIGNED, driverId },
        $push: {
          statusHistory: {
            status: OrderStatus.ASSIGNED,
            changedBy: `DRIVER:${driverId}`,
            changedAt: new Date(),
            note: `Course acceptée par ${driver.firstName}`
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

    await AuditLog.create({
      action: 'ORDER_ACCEPTED_BY_DRIVER',
      actorId: driverId,
      actorRole: 'DRIVER',
      targetModel: 'Order',
      targetId: orderId,
      details: { driverName: `${driver.firstName} ${driver.lastName}` }
    });

    if (socketEmitter) {
      socketEmitter.emitToOrder(order.trackingToken, 'order:status-changed', {
        orderId: order._id,
        status: OrderStatus.ASSIGNED,
        driver: { firstName: driver.firstName, phone: driver.phone }
      });
      socketEmitter.emitToAdmin('order:updated', order);
      socketEmitter.emitToDrivers('order:taken', { orderId });
    }

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
      title: `Livreur en route !`,
      body: `Votre commande #${order.orderNumber} est en cours d'acheminement.`,
      data: { orderId: order._id.toString(), status: OrderStatus.OUT_FOR_DELIVERY }
    }).catch(() => {});

    return order;
  }

  async confirmDelivered(orderId, driverId, socketEmitter = null) {
    const order = await Order.findOneAndUpdate(
      { _id: orderId, driverId, status: OrderStatus.OUT_FOR_DELIVERY },
      {
        $set: { status: OrderStatus.DELIVERED, 'payment.status': 'PAID' },
        $push: {
          statusHistory: {
            status: OrderStatus.DELIVERED,
            changedBy: `DRIVER:${driverId}`,
            changedAt: new Date(),
            note: 'Commande remise avec succès au client'
          }
        }
      },
      { new: true }
    );

    if (!order) {
      const error = new Error('Impossible de confirmer la livraison.');
      error.statusCode = 400;
      error.code = ErrorCodes.INVALID_ORDER_STATUS;
      throw error;
    }

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
    }

    const driverName = driver ? `${driver.firstName} ${driver.lastName}` : 'Le livreur';

    // Notification au client
    notificationService.notifyCustomerByTrackingToken(order.trackingToken, {
      title: `Commande livrée !`,
      body: `Votre commande #${order.orderNumber} a été livrée. Bon appétit !`,
      data: { orderId: order._id.toString(), status: OrderStatus.DELIVERED }
    }).catch(() => {});

    // Notification à l'administrateur
    notificationService.notifyAdmins({
      title: `Commande #${order.orderNumber} livrée !`,
      body: `Livrée avec succès par ${driverName}.`,
      data: { orderId: order._id.toString(), type: 'ORDER_DELIVERED' },
      url: '/admin'
    }).catch(() => {});

    return order;
  }

  async getActiveDeliveries(driverId) {
    return Order.find({
      driverId,
      status: { $in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY] }
    })
      .sort({ createdAt: -1 })
      .lean();
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
}

module.exports = new DriverService();
