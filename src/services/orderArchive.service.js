/**
 * Service de gestion de l'archivage et de la suppression des commandes (OrderArchiveService).
 * Permet aux administrateurs et livreurs de désencombrer leurs listes sans perturber le cycle de vie actif.
 */

const Order = require('../models/order.model');
const AuditLog = require('../models/auditLog.model');
const { OrderStatus } = require('../constants/enums');

class OrderArchiveService {
  async archiveOrder(orderId, actorId, actorRole) {
    const order = await Order.findByIdAndUpdate(
      orderId,
      { isArchived: true },
      { new: true }
    );
    if (!order) {
      const error = new Error('Commande introuvable.');
      error.statusCode = 404;
      throw error;
    }

    await AuditLog.create({
      action: 'ORDER_ARCHIVED',
      actorId,
      actorRole,
      targetModel: 'Order',
      targetId: orderId,
      details: { orderNumber: order.orderNumber }
    });

    return order;
  }

  async unarchiveOrder(orderId, actorId, actorRole) {
    const order = await Order.findByIdAndUpdate(
      orderId,
      { isArchived: false },
      { new: true }
    );
    if (!order) {
      const error = new Error('Commande introuvable.');
      error.statusCode = 404;
      throw error;
    }

    await AuditLog.create({
      action: 'ORDER_UNARCHIVED',
      actorId,
      actorRole,
      targetModel: 'Order',
      targetId: orderId,
      details: { orderNumber: order.orderNumber }
    });

    return order;
  }

  async archiveCompletedOrders(actorId, actorRole) {
    const result = await Order.updateMany(
      {
        status: { $in: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
        isArchived: { $ne: true }
      },
      { isArchived: true }
    );

    await AuditLog.create({
      action: 'COMPLETED_ORDERS_BATCH_ARCHIVED',
      actorId,
      actorRole,
      targetModel: 'Order',
      targetId: 'BATCH',
      details: { archivedCount: result.modifiedCount }
    });

    return { message: 'Commandes terminées archivées avec succès', count: result.modifiedCount };
  }

  async deleteOrder(orderId, actorId, actorRole) {
    const order = await Order.findById(orderId);
    if (!order) {
      const error = new Error('Commande introuvable.');
      error.statusCode = 404;
      throw error;
    }

    // Protection : Ne pas supprimer une commande active en cuisine ou en livraison
    const activeStatuses = [OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP, OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY];
    if (activeStatuses.includes(order.status)) {
      const error = new Error('Impossible de supprimer une commande active en cours de préparation ou de livraison.');
      error.statusCode = 400;
      throw error;
    }

    await Order.findByIdAndDelete(orderId);

    await AuditLog.create({
      action: 'ORDER_DELETED',
      actorId,
      actorRole,
      targetModel: 'Order',
      targetId: orderId,
      details: { orderNumber: order.orderNumber, total: order.total }
    });

    return { message: 'Commande supprimée définitivement avec succès' };
  }

  // --- ACTIONS LIVREUR ---
  async archiveDriverOrder(driverId, orderId) {
    const order = await Order.findOneAndUpdate(
      { _id: orderId, driverId },
      { driverArchived: true },
      { new: true }
    );
    if (!order) {
      const error = new Error('Course introuvable dans votre historique.');
      error.statusCode = 404;
      throw error;
    }
    return order;
  }

  async clearDriverHistory(driverId) {
    const result = await Order.updateMany(
      {
        driverId,
        status: OrderStatus.DELIVERED,
        driverArchived: { $ne: true }
      },
      { driverArchived: true }
    );
    return { message: 'Historique des livraisons purgé avec succès', count: result.modifiedCount };
  }
}

module.exports = new OrderArchiveService();
