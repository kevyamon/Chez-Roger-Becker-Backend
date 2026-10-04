/**
 * Contrôleur dédié aux actions d'administration sur les commandes (AdminOrderController).
 * Prise en compte du statut de lecture, attribution de coursier, archivage et suppression.
 */

const adminOrderService = require('../services/adminOrder.service');
const orderArchiveService = require('../services/orderArchive.service');
const { sendSuccess } = require('../utils/responseHelper');

class AdminOrderController {
  /**
   * Marque une commande comme vue dès la consultation de son détail.
   */
  async markAsViewed(req, res, next) {
    try {
      const socketEmitter = req.app.get('socketEmitter');
      const { order, unviewedCount } = await adminOrderService.markOrderAsViewed(
        req.params.id,
        req.user.id,
        socketEmitter
      );

      return sendSuccess(
        res,
        { order, unviewedCount },
        'Commande marquée comme consultée'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Marque toutes les commandes non lues comme déjà vues.
   */
  async markAllAsViewed(req, res, next) {
    try {
      const socketEmitter = req.app.get('socketEmitter');
      const result = await adminOrderService.markAllOrdersAsViewed(
        req.user.id,
        socketEmitter
      );

      return sendSuccess(
        res,
        result,
        'Toutes les commandes ont été marquées comme consultées'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assigne manuellement un livreur en ligne à une commande.
   */
  async assignDriver(req, res, next) {
    try {
      const { driverId } = req.body;
      if (!driverId) {
        const error = new Error('L\'identifiant du livreur (driverId) est requis.');
        error.statusCode = 400;
        throw error;
      }

      const socketEmitter = req.app.get('socketEmitter');
      const order = await adminOrderService.assignDriverToOrder(
        req.params.id,
        driverId,
        req.user.id,
        socketEmitter
      );

      return sendSuccess(
        res,
        { order },
        'Livreur assigné avec succès à la commande'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Archive une commande pour la masquer de la vue principale.
   */
  async archiveOrder(req, res, next) {
    try {
      const order = await orderArchiveService.archiveOrder(
        req.params.id,
        req.user.id,
        'ADMIN'
      );
      const socketEmitter = req.app.get('socketEmitter');
      if (socketEmitter) socketEmitter.emitToAdmin('order:updated', order);
      return sendSuccess(res, { order }, 'Commande archivée avec succès');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Désarchive une commande.
   */
  async unarchiveOrder(req, res, next) {
    try {
      const order = await orderArchiveService.unarchiveOrder(
        req.params.id,
        req.user.id,
        'ADMIN'
      );
      const socketEmitter = req.app.get('socketEmitter');
      if (socketEmitter) socketEmitter.emitToAdmin('order:updated', order);
      return sendSuccess(res, { order }, 'Commande désarchivée');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Archive en lot l'ensemble des commandes livrées ou annulées.
   */
  async archiveCompletedOrders(req, res, next) {
    try {
      const result = await orderArchiveService.archiveCompletedOrders(
        req.user.id,
        'ADMIN'
      );
      return sendSuccess(res, result, 'Toutes les commandes terminées ont été archivées');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Supprime définitivement une commande (terminée ou annulée).
   */
  async deleteOrder(req, res, next) {
    try {
      const result = await orderArchiveService.deleteOrder(
        req.params.id,
        req.user.id,
        'ADMIN'
      );
      const socketEmitter = req.app.get('socketEmitter');
      if (socketEmitter) socketEmitter.emitToAdmin('order:deleted', { orderId: req.params.id });
      return sendSuccess(res, result, 'Commande supprimée avec succès');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminOrderController();
