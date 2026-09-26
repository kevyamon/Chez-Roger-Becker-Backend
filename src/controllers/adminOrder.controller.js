/**
 * Contrôleur dédié aux actions d'administration sur les commandes (AdminOrderController).
 * Prise en compte du statut de lecture/consultation et attribution de coursier.
 */

const adminOrderService = require('../services/adminOrder.service');
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
}

module.exports = new AdminOrderController();
