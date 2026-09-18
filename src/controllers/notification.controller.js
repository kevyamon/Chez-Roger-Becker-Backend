/**
 * Contrôleur de gestion des abonnements aux notifications push (NotificationController).
 */

const notificationService = require('../services/notification.service');
const { sendSuccess } = require('../utils/responseHelper');

class NotificationController {
  /**
   * Enregistrement d'un jeton FCM pour un appareil.
   */
  async subscribe(req, res, next) {
    try {
      const { token, role, trackingToken, userAgent } = req.body;
      const userId = req.user ? req.user.id : null;
      const effectiveRole = req.user ? req.user.role : (role || 'CUSTOMER');

      const subscription = await notificationService.subscribe({
        token,
        userId,
        role: effectiveRole,
        trackingToken,
        userAgent: userAgent || req.headers['user-agent'] || ''
      });

      return sendSuccess(res, { subscription }, 'Abonnement aux notifications enregistré avec succès', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Association d'une commande (trackingToken) à un jeton existant.
   */
  async linkOrder(req, res, next) {
    try {
      const { token, trackingToken } = req.body;
      const subscription = await notificationService.linkOrderToDevice(token, trackingToken);
      return sendSuccess(res, { subscription }, 'Commande associée à vos notifications');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Désinscription d'un jeton FCM.
   */
  async unsubscribe(req, res, next) {
    try {
      const { token } = req.body;
      await notificationService.unsubscribe(token);
      return sendSuccess(res, {}, 'Désinscription des notifications effectuée');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
