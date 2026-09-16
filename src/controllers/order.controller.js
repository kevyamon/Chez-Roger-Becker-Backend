/**
 * Controleur pour les commandes des clients (OrderController).
 * Orchestration du passage de commande sans compte et du suivi temps reel via token.
 */

const orderService = require('../services/order.service');
const { sendSuccess } = require('../utils/responseHelper');

class OrderController {
  async createOrder(req, res, next) {
    try {
      const socketEmitter = req.app.get('socketEmitter');
      const order = await orderService.createOrder(req.body, socketEmitter);

      return sendSuccess(
        res,
        {
          order: {
            id: order._id,
            orderNumber: order.orderNumber,
            trackingToken: order.trackingToken,
            total: order.total,
            status: order.status,
            createdAt: order.createdAt
          }
        },
        'Votre commande a ete enregistree avec succes et transmise au restaurant.',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  async trackOrder(req, res, next) {
    try {
      const { token } = req.params;
      const order = await orderService.trackOrderByToken(token);

      return sendSuccess(
        res,
        { order },
        'Informations de suivi de la commande recuperees avec succes'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();
