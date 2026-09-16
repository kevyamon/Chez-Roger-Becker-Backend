/**
 * Controleur pour l'espace et les operations des livreurs (DriverController).
 */

const driverService = require('../services/driver.service');
const orderService = require('../services/order.service');
const { sendSuccess, sendPaginated } = require('../utils/responseHelper');

class DriverController {
  async getDashboard(req, res, next) {
    try {
      const activeDeliveries = await driverService.getActiveDeliveries(req.user.id);
      const availableOrders = await driverService.getAvailableOrders();

      return sendSuccess(
        res,
        {
          activeDeliveries,
          availableOrdersCount: availableOrders.length,
          availableOrders
        },
        'Tableau de bord livreur charge avec succes'
      );
    } catch (error) {
      next(error);
    }
  }

  async getAvailableOrders(req, res, next) {
    try {
      const orders = await driverService.getAvailableOrders();
      return sendSuccess(res, { orders }, 'Commandes disponibles recuperees');
    } catch (error) {
      next(error);
    }
  }

  async getMyOrders(req, res, next) {
    try {
      const orders = await driverService.getActiveDeliveries(req.user.id);
      return sendSuccess(res, { orders }, 'Vos courses en cours');
    } catch (error) {
      next(error);
    }
  }

  async acceptOrder(req, res, next) {
    try {
      const socketEmitter = req.app.get('socketEmitter');
      const order = await driverService.acceptOrder(req.params.id, req.user.id, socketEmitter);
      return sendSuccess(res, { order }, 'Course acceptee avec succes ! En route vers le restaurant.');
    } catch (error) {
      next(error);
    }
  }

  async confirmPickup(req, res, next) {
    try {
      const socketEmitter = req.app.get('socketEmitter');
      const order = await driverService.confirmPickup(req.params.id, req.user.id, socketEmitter);
      return sendSuccess(res, { order }, 'Repas recupere avec succes');
    } catch (error) {
      next(error);
    }
  }

  async startDelivery(req, res, next) {
    try {
      const socketEmitter = req.app.get('socketEmitter');
      const order = await driverService.startDelivery(req.params.id, req.user.id, socketEmitter);
      return sendSuccess(res, { order }, 'Livraison en cours vers le client');
    } catch (error) {
      next(error);
    }
  }

  async confirmDelivered(req, res, next) {
    try {
      const socketEmitter = req.app.get('socketEmitter');
      const order = await driverService.confirmDelivered(req.params.id, req.user.id, socketEmitter);
      return sendSuccess(res, { order }, 'Course terminee et confirmee avec succes !');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const socketEmitter = req.app.get('socketEmitter');
      const driver = await driverService.updateStatus(req.user.id, req.body.status, socketEmitter);
      return sendSuccess(res, { driver }, 'Statut de disponibilite mis a jour');
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const { orders, total } = await driverService.getDriverHistory(req.user.id, { page, limit });
      return sendPaginated(res, orders, { total, page, limit }, 'Historique de vos livraisons');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DriverController();
