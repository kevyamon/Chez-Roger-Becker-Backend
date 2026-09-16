/**
 * Service de gestion des activites des livreurs (DriverService).
 * Gere la disponibilite, l'attribution atomique anti-concurrence et le cycle de livraison.
 */

const User = require('../models/user.model');
const Order = require('../models/order.model');
const AuditLog = require('../models/auditLog.model');
const { DriverStatus, OrderStatus, ErrorCodes } = require('../constants/enums');

class DriverService {
  /**
   * Mise a jour du statut de disponibilite du livreur (AVAILABLE, BUSY, OFFLINE).
   */
  async updateStatus(driverId, newStatus, socketEmitter = null) {
    const driver = await User.findOneAndUpdate(
      { _id: driverId, role: 'DRIVER', isActive: true },
      { driverStatus: newStatus },
      { new: true }
    );

    if (!driver) {
      const error = new Error('Livreur introuvable ou desactive.');
      error.statusCode = 404;
      error.code = ErrorCodes.NOT_FOUND;
      throw error;
    }

    if (socketEmitter) {
      socketEmitter.emitToAdmin('driver:status-changed', {
        driverId: driver._id,
        status: newStatus
      });
    }

    return driver;
  }

  /**
   * Commandes disponibles pretes a etre recuperees par les livreurs.
   */
  async getAvailableOrders() {
    return Order.find({
      status: OrderStatus.READY_FOR_PICKUP,
      driverId: null
    })
      .sort({ createdAt: 1 })
      .lean();
  }

  /**
   * Acceptation atomique d'une commande par un livreur (Verrouillage anti-concurrence).
   */
  async acceptOrder(orderId, driverId, socketEmitter = null) {
    // 1. Verification de la disponibilite du livreur
    const driver = await User.findById(driverId);
    if (!driver || driver.driverStatus === DriverStatus.OFFLINE) {
      const error = new Error('Vous devez etre connecte et disponible pour accepter une course.');
      error.statusCode = 400;
      error.code = ErrorCodes.DRIVER_NOT_AVAILABLE;
      throw error;
    }

    // 2. Attribution atomique en base (une seule requete concurrente reussira)
    const order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: OrderStatus.READY_FOR_PICKUP,
        driverId: null
      },
      {
        $set: {
          status: OrderStatus.ASSIGNED,
          driverId: driverId
        },
        $push: {
          statusHistory: {
            status: OrderStatus.ASSIGNED,
            changedBy: `DRIVER:${driverId}`,
            changedAt: new Date(),
            note: `Course acceptee par le livreur ${driver.firstName}`
          }
        }
      },
      { new: true }
    );

    if (!order) {
      const error = new Error('Cette commande a deja ete assignee a un autre livreur ou n est plus disponible.');
      error.statusCode = 409;
      error.code = ErrorCodes.ORDER_ALREADY_ASSIGNED;
      throw error;
    }

    // 3. Bascule du statut du livreur a BUSY
    driver.driverStatus = DriverStatus.BUSY;
    await driver.save();

    // 4. Tracabilite et notifications
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

  /**
   * Confirmation de recuperation de la commande au restaurant.
   */
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
            note: 'Repas recupere en cuisine par le livreur'
          }
        }
      },
      { new: true }
    );

    if (!order) {
      const error = new Error('Impossible de valider la recuperation de cette commande.');
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

  /**
   * Depart en livraison chez le client.
   */
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
            note: 'Livreur en route vers l adresse de livraison'
          }
        }
      },
      { new: true }
    );

    if (!order) {
      const error = new Error('Impossible de demarrer la livraison pour cette commande.');
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

    return order;
  }

  /**
   * Confirmation finale de livraison effectuee.
   */
  async confirmDelivered(orderId, driverId, socketEmitter = null) {
    const order = await Order.findOneAndUpdate(
      { _id: orderId, driverId, status: OrderStatus.OUT_FOR_DELIVERY },
      {
        $set: {
          status: OrderStatus.DELIVERED,
          'payment.status': 'PAID'
        },
        $push: {
          statusHistory: {
            status: OrderStatus.DELIVERED,
            changedBy: `DRIVER:${driverId}`,
            changedAt: new Date(),
            note: 'Commande remise avec succes au client'
          }
        }
      },
      { new: true }
    );

    if (!order) {
      const error = new Error('Impossible de confirmer la livraison de cette commande.');
      error.statusCode = 400;
      error.code = ErrorCodes.INVALID_ORDER_STATUS;
      throw error;
    }

    // Le livreur redevient automatiquement disponible
    await User.findByIdAndUpdate(driverId, { driverStatus: DriverStatus.AVAILABLE });

    if (socketEmitter) {
      socketEmitter.emitToOrder(order.trackingToken, 'order:status-changed', {
        orderId: order._id,
        status: OrderStatus.DELIVERED
      });
      socketEmitter.emitToAdmin('order:updated', order);
    }

    return order;
  }

  /**
   * Livraisons actives du livreur.
   */
  async getActiveDeliveries(driverId) {
    return Order.find({
      driverId,
      status: { $in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY] }
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Historique des courses terminees par le livreur.
   */
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
