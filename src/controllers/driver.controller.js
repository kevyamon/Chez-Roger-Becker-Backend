/**
 * Contrôleur pour l'espace et les opérations des livreurs (DriverController).
 * Orchestration des courses, validation PIN de livraison, profil et statistiques.
 */

const driverService = require('../services/driver.service');
const driverProfileService = require('../services/driverProfile.service');
const { sendSuccess, sendPaginated } = require('../utils/responseHelper');

class DriverController {
  async getDashboard(req, res, next) {
    try {
      const activeDeliveries = await driverService.getActiveDeliveries(req.user.id);
      const availableOrders = await driverService.getAvailableOrders(req.user.id);
      const stats = await driverProfileService.getDriverStats(req.user.id);

      return sendSuccess(
        res,
        {
          activeDeliveries,
          availableOrdersCount: availableOrders.length,
          availableOrders,
          stats
        },
        'Tableau de bord livreur chargé avec succès'
      );
    } catch (error) {
      next(error);
    }
  }

  async getAvailableOrders(req, res, next) {
    try {
      const orders = await driverService.getAvailableOrders(req.user.id);
      return sendSuccess(res, { orders }, 'Commandes disponibles récupérées');
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
      return sendSuccess(res, { order }, 'Course acceptée avec succès ! Rendez-vous au restaurant.');
    } catch (error) {
      next(error);
    }
  }

  async confirmPickup(req, res, next) {
    try {
      const socketEmitter = req.app.get('socketEmitter');
      const order = await driverService.confirmPickup(req.params.id, req.user.id, socketEmitter);
      return sendSuccess(res, { order }, 'Repas récupéré avec succès');
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
      const { deliveryPin } = req.body;
      const order = await driverService.confirmDelivered(req.params.id, req.user.id, deliveryPin, socketEmitter);
      return sendSuccess(res, { order }, 'Course terminée et livrée avec succès !');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const socketEmitter = req.app.get('socketEmitter');
      const driver = await driverService.updateStatus(req.user.id, req.body.status, socketEmitter);
      return sendSuccess(res, { driver }, 'Statut de disponibilité mis à jour');
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

  async getStats(req, res, next) {
    try {
      const stats = await driverProfileService.getDriverStats(req.user.id);
      return sendSuccess(res, { stats }, 'Statistiques du livreur récupérées');
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const user = await driverProfileService.updateProfile(req.user.id, req.body);
      return sendSuccess(res, { user }, 'Profil mis à jour avec succès');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const result = await driverProfileService.changePassword(req.user.id, req.body);
      return sendSuccess(res, result, 'Mot de passe modifié avec succès');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DriverController();
