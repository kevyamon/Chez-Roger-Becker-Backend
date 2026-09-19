/**
 * Service de gestion des activités des livreurs (DriverService).
 * Disponibilité, acceptation concurrente, cycle de livraison, statistiques et profil.
 */

const bcrypt = require('bcryptjs');
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

    notificationService.notifyCustomerByTrackingToken(order.trackingToken, {
      title: 'Commande livrée !',
      body: `Votre commande #${order.orderNumber} a été livrée avec succès. Bon appétit !`,
      data: { orderId: order._id.toString(), status: OrderStatus.DELIVERED }
    }).catch(() => {});

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

  async getDriverStats(driverId) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [todayOrders, totalOrders, todayFinancials, totalFinancials] = await Promise.all([
      Order.countDocuments({ driverId, status: OrderStatus.DELIVERED, updatedAt: { $gte: startOfToday } }),
      Order.countDocuments({ driverId, status: OrderStatus.DELIVERED }),
      Order.aggregate([
        { $match: { driverId, status: OrderStatus.DELIVERED, updatedAt: { $gte: startOfToday } } },
        { $group: { _id: null, totalCash: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        { $match: { driverId, status: OrderStatus.DELIVERED } },
        { $group: { _id: null, totalCash: { $sum: '$total' } } }
      ])
    ]);

    return {
      todayDeliveries: todayOrders,
      totalDeliveries: totalOrders,
      todayCashCollected: todayFinancials[0]?.totalCash || 0,
      totalCashCollected: totalFinancials[0]?.totalCash || 0
    };
  }

  async updateProfile(driverId, { firstName, lastName, phone, email }) {
    const updates = {};
    if (firstName) updates.firstName = firstName.trim();
    if (lastName) updates.lastName = lastName.trim();

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: driverId } });
      if (existing) {
        const error = new Error('Cette adresse e-mail est déjà utilisée par un autre compte.');
        error.statusCode = 409;
        throw error;
      }
      updates.email = normalizedEmail;
    }

    if (phone) {
      const normalizedPhone = phone.trim();
      const existing = await User.findOne({ phone: normalizedPhone, _id: { $ne: driverId } });
      if (existing) {
        const error = new Error('Ce numéro de téléphone est déjà utilisé.');
        error.statusCode = 409;
        throw error;
      }
      updates.phone = normalizedPhone;
    }

    const updatedUser = await User.findByIdAndUpdate(driverId, updates, { new: true, runValidators: true });
    return updatedUser ? updatedUser.toJSON() : null;
  }

  async changePassword(driverId, { oldPassword, newPassword }) {
    const user = await User.findById(driverId).select('+passwordHash');
    if (!user) {
      const error = new Error('Compte livreur introuvable.');
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      const error = new Error('Le mot de passe actuel est incorrect.');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return { message: 'Mot de passe modifié avec succès.' };
  }
}

module.exports = new DriverService();
