/**
 * Contrôleur d'administration du restaurant (AdminController).
 * Gestion du dashboard, catalogue, commandes, livreurs, téléversement Cloudinary et paramètres.
 */

const settingsService = require('../services/settings.service');
const menuService = require('../services/menu.service');
const orderService = require('../services/order.service');
const uploadService = require('../services/upload.service');
const Order = require('../models/order.model');
const { sendSuccess, sendPaginated } = require('../utils/responseHelper');

class AdminController {
  // DASHBOARD
  async getDashboard(req, res, next) {
    try {
      const data = await settingsService.getDashboardKPIs();
      return sendSuccess(res, data, 'Indicateurs du tableau de bord chargés');
    } catch (error) {
      next(error);
    }
  }

  // TÉLÉVERSEMENT D'IMAGE (CLOUDINARY)
  async uploadImage(req, res, next) {
    try {
      if (!req.file) {
        const error = new Error('Veuillez sélectionner un fichier image valide depuis votre galerie.');
        error.statusCode = 400;
        throw error;
      }
      const result = await uploadService.uploadImageFromBuffer(req.file.buffer);
      return sendSuccess(res, result, 'Image téléversée avec succès sur Cloudinary', 201);
    } catch (error) {
      next(error);
    }
  }

  // PLATS (DISHES)
  async getDishes(req, res, next) {
    try {
      const { categoryId, category, type, isAvailable, search, page = 1, limit = 20 } = req.query;
      const { dishes, total } = await menuService.getAdminDishes({ categoryId, category, type, isAvailable, search, page, limit });
      return sendPaginated(res, dishes, { total, page, limit }, 'Plats récupérés avec succès');
    } catch (error) {
      next(error);
    }
  }

  async createDish(req, res, next) {
    try {
      const dish = await menuService.createDish(req.body, req.user.id);
      const socketEmitter = req.app.get('socketEmitter');
      if (socketEmitter) socketEmitter.emitGlobal('dish:created', dish);
      return sendSuccess(res, { dish }, 'Plat ajouté avec succès', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateDish(req, res, next) {
    try {
      const dish = await menuService.updateDish(req.params.id, req.body, req.user.id);
      const socketEmitter = req.app.get('socketEmitter');
      if (socketEmitter) socketEmitter.emitGlobal('dish:updated', dish);
      return sendSuccess(res, { dish }, 'Plat mis à jour avec succès');
    } catch (error) {
      next(error);
    }
  }

  async deleteDish(req, res, next) {
    try {
      await menuService.deleteDish(req.params.id, req.user.id);
      const socketEmitter = req.app.get('socketEmitter');
      if (socketEmitter) socketEmitter.emitGlobal('dish:deleted', { dishId: req.params.id });
      return sendSuccess(res, {}, 'Plat supprimé avec succès');
    } catch (error) {
      next(error);
    }
  }

  // CATÉGORIES
  async getCategories(req, res, next) {
    try {
      const categories = await menuService.getCategories(false);
      return sendSuccess(res, { categories }, 'Catégories récupérées');
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req, res, next) {
    try {
      const category = await menuService.createCategory(req.body, req.user.id);
      const socketEmitter = req.app.get('socketEmitter');
      if (socketEmitter) socketEmitter.emitGlobal('category:created', category);
      return sendSuccess(res, { category }, 'Catégorie créée avec succès', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req, res, next) {
    try {
      const category = await menuService.updateCategory(req.params.id, req.body, req.user.id);
      const socketEmitter = req.app.get('socketEmitter');
      if (socketEmitter) socketEmitter.emitGlobal('category:updated', category);
      return sendSuccess(res, { category }, 'Catégorie mise à jour');
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      await menuService.deleteCategory(req.params.id, req.user.id);
      const socketEmitter = req.app.get('socketEmitter');
      if (socketEmitter) socketEmitter.emitGlobal('category:deleted', { categoryId: req.params.id });
      return sendSuccess(res, {}, 'Catégorie supprimée');
    } catch (error) {
      next(error);
    }
  }

  // COMMANDES (ORDERS)
  async getOrders(req, res, next) {
    try {
      const { status, driverId, search, date, page = 1, limit = 20 } = req.query;
      const { orders, total } = await orderService.getAdminOrders({ status, driverId, search, date, page, limit });
      return sendPaginated(res, orders, { total, page, limit }, 'Commandes récupérées');
    } catch (error) {
      next(error);
    }
  }

  async getOrderById(req, res, next) {
    try {
      const order = await Order.findById(req.params.id).populate('driverId', 'firstName lastName phone');
      return sendSuccess(res, { order }, 'Détails de la commande chargés');
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(req, res, next) {
    try {
      const socketEmitter = req.app.get('socketEmitter');
      const order = await orderService.updateOrderStatus(
        req.params.id,
        req.body.status,
        req.user.id,
        'ADMIN',
        req.body.note,
        socketEmitter
      );
      return sendSuccess(res, { order }, 'Statut de commande mis à jour avec succès');
    } catch (error) {
      next(error);
    }
  }

  // LIVREURS (DRIVERS)
  async getDrivers(req, res, next) {
    try {
      const drivers = await settingsService.getAllDrivers();
      return sendSuccess(res, { drivers }, 'Livreurs récupérés');
    } catch (error) {
      next(error);
    }
  }

  async createDriver(req, res, next) {
    try {
      const driver = await settingsService.createDriver(req.body, req.user.id);
      const socketEmitter = req.app.get('socketEmitter');
      if (socketEmitter) socketEmitter.emitToAdmin('driver:created', driver);
      return sendSuccess(res, { driver }, 'Compte livreur créé avec succès', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateDriver(req, res, next) {
    try {
      const driver = await settingsService.updateDriver(req.params.id, req.body, req.user.id);
      const socketEmitter = req.app.get('socketEmitter');
      if (socketEmitter) socketEmitter.emitToAdmin('driver:updated', driver);
      return sendSuccess(res, { driver }, 'Compte livreur mis à jour');
    } catch (error) {
      next(error);
    }
  }

  // PARAMÈTRES (SETTINGS)
  async getSettings(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      return sendSuccess(res, { settings }, 'Paramètres chargés avec succès');
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const settings = await settingsService.updateSettings(req.body, req.user.id);
      const socketEmitter = req.app.get('socketEmitter');
      if (socketEmitter) socketEmitter.emitGlobal('restaurant:updated', settings);
      return sendSuccess(res, { settings }, 'Paramètres mis à jour avec succès');
    } catch (error) {
      next(error);
    }
  }

  // PROMOTIONS (ADMIN)
  async getPromotions(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const { promotions, total } = await menuService.getAdminPromotions({ page, limit });
      return sendPaginated(res, promotions, { total, page, limit }, 'Promotions récupérées avec succès');
    } catch (error) {
      next(error);
    }
  }

  async createPromotion(req, res, next) {
    try {
      const promo = await menuService.createPromotion(req.body, req.user.id);
      const socketEmitter = req.app.get('socketEmitter');
      if (socketEmitter) socketEmitter.emitGlobal('promotion:created', promo);
      return sendSuccess(res, { promo }, 'Offre promotionnelle créée avec succès', 201);
    } catch (error) {
      next(error);
    }
  }

  async updatePromotion(req, res, next) {
    try {
      const promo = await menuService.updatePromotion(req.params.id, req.body, req.user.id);
      const socketEmitter = req.app.get('socketEmitter');
      if (socketEmitter) socketEmitter.emitGlobal('promotion:updated', promo);
      return sendSuccess(res, { promo }, 'Offre promotionnelle mise à jour avec succès');
    } catch (error) {
      next(error);
    }
  }

  async deletePromotion(req, res, next) {
    try {
      await menuService.deletePromotion(req.params.id, req.user.id);
      const socketEmitter = req.app.get('socketEmitter');
      if (socketEmitter) socketEmitter.emitGlobal('promotion:deleted', { promoId: req.params.id });
      return sendSuccess(res, {}, 'Offre promotionnelle supprimée avec succès');
    } catch (error) {
      next(error);
    }
  }

  // JOURNAL D'AUDIT (AUDIT LOGS)
  async getAuditLogs(req, res, next) {
    try {
      const { page = 1, limit = 30, action, actorId } = req.query;
      const { logs, total } = await settingsService.getAuditLogs({ page, limit, action, actorId });
      return sendPaginated(res, logs, { total, page, limit }, 'Journal d\'audit récupéré avec succès');
    } catch (error) {
      next(error);
    }
  }

  // HISTORIQUE DES COMMANDES LIVRÉES
  async getOrdersHistory(req, res, next) {
    try {
      const { page = 1, limit = 20, search, date } = req.query;
      const { orders, total } = await settingsService.getCompletedOrdersHistory({ page, limit, search, date });
      return sendPaginated(res, orders, { total, page, limit }, 'Historique des commandes chargé');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
