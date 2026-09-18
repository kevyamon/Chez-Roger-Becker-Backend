/**
 * Service central des notifications push (NotificationService).
 * Gère les abonnements d'appareils et l'envoi ciblé multi-destinataires via Firebase Cloud Messaging.
 */

const { messaging } = require('../config/firebase');
const PushSubscription = require('../models/pushSubscription.model');

class NotificationService {
  /**
   * Enregistrement ou mise à jour du jeton FCM d'un appareil.
   */
  async subscribe({ token, userId = null, role = 'CUSTOMER', trackingToken = null, userAgent = '' }) {
    const update = {
      role: role || 'CUSTOMER',
      userAgent,
      lastActiveAt: new Date()
    };

    if (userId) update.userId = userId;

    const subscription = await PushSubscription.findOneAndUpdate(
      { token },
      {
        $set: update,
        ...(trackingToken ? { $addToSet: { trackingTokens: trackingToken } } : {})
      },
      { upsert: true, new: true }
    );

    return subscription;
  }

  /**
   * Associe une commande spécifique (trackingToken) à un jeton d'appareil existant.
   */
  async linkOrderToDevice(token, trackingToken) {
    return PushSubscription.findOneAndUpdate(
      { token },
      {
        $addToSet: { trackingTokens: trackingToken },
        $set: { lastActiveAt: new Date() }
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Suppression d'un jeton (déconnexion ou révocation).
   */
  async unsubscribe(token) {
    return PushSubscription.findOneAndDelete({ token });
  }

  /**
   * Envoi d'une notification à tous les administrateurs connectés.
   */
  async notifyAdmins({ title, body, data = {}, url = '/admin' }) {
    const subscriptions = await PushSubscription.find({ role: 'ADMIN' }).lean();
    if (!subscriptions.length) return;
    const tokens = subscriptions.map((s) => s.token);
    await this._sendMulticast(tokens, { title, body, data: { ...data, url } });
  }

  /**
   * Envoi d'une notification aux livreurs disponibles (ou à un livreur précis).
   */
  async notifyDrivers({ title, body, data = {}, url = '/driver', driverId = null }) {
    const query = { role: 'DRIVER' };
    if (driverId) query.userId = driverId;
    const subscriptions = await PushSubscription.find(query).lean();
    if (!subscriptions.length) return;
    const tokens = subscriptions.map((s) => s.token);
    await this._sendMulticast(tokens, { title, body, data: { ...data, url } });
  }

  /**
   * Envoi d'une notification au client lié à une commande précise via son trackingToken.
   */
  async notifyCustomerByTrackingToken(trackingToken, { title, body, data = {}, url = null }) {
    if (!trackingToken) return;
    const subscriptions = await PushSubscription.find({ trackingTokens: trackingToken }).lean();
    if (!subscriptions.length) return;
    const tokens = subscriptions.map((s) => s.token);
    const targetUrl = url || `/track/${trackingToken}`;
    await this._sendMulticast(tokens, { title, body, data: { ...data, url: targetUrl, trackingToken } });
  }

  /**
   * Méthode interne pour l'envoi groupé et le nettoyage automatique des jetons invalides.
   */
  async _sendMulticast(tokens, { title, body, data = {} }) {
    if (!messaging || !tokens || tokens.length === 0) return;

    // Normalisation des valeurs de data en chaînes de caractères (exigence FCM)
    const stringData = {};
    for (const [key, value] of Object.entries(data)) {
      stringData[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }

    const payload = {
      tokens,
      notification: {
        title,
        body
      },
      data: stringData,
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          title,
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          vibrate: [200, 100, 200],
          requireInteraction: true
        },
        fcmOptions: {
          link: data.url || '/'
        }
      }
    };

    try {
      const response = await messaging.sendEachForMulticast(payload);
      
      // Nettoyage des jetons expirés ou désinstallés
      if (response.failureCount > 0) {
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error;
            if (
              error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(tokens[idx]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          await PushSubscription.deleteMany({ token: { $in: invalidTokens } });
        }
      }
    } catch (error) {
      console.error('[NotificationService] Erreur lors de l\'envoi multicast :', error.message);
    }
  }
}

module.exports = new NotificationService();
