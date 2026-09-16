/**
 * Controleur d'administration du restaurant (AdminController).
 * Gestion complete du dashboard, catalogue, commandes, livreurs et parametres.
 */

const settingsService = require('../services/settings.service');
const menuService = require('../services/menu.service');
const orderService = require('../services/order.service');
const Category = require('../models/category.model');
const Dish = require('../models/dish.model');
const Promotion = require('../models/promotion.model');
const Order = require('../models/order.model');
const { sendSuccess, sendPaginated } = require('../utils/responseHelper');

class AdminController {
  // DASHBOARD
  async getDashboard(req, res, next) {
    try {
      const data = await settingsService.getDashboardKPIs();
      return sendSuccess(res, data, 'Indicateurs du tableau de bord charges');
    } catch (error) {
      next(error);
    }
  }

  // PLATS (DISHES)
  async getDishes(req, res, next) {
    try {
      const { categoryId, isAvailable, search, page = 1, limit = 20 } = req.query;
      const { dishes, total } = await menuService.getAdminDishes({ categoryId, isAvailable, search, page, limit });
      return sendPaginated(res, dishes, { total, page, limit }, 'Plats recuperes avec succes');
    } catch (error) {
      next(error);
    }
  }

  async createDish(req, res, next) {
    try {
      const dish = await menuService.createDish(req.body, req.user.id);
      return sendSuccess(res, { dish }, 'Plat ajoute avec succes', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateDish(req, res, next) {
    try {
      const dish = await menuService.updateDish(req.params.id, req.body, req.user.id);
      return sendSuccess(res, { dish }, 'Plat mis a jour avec succes');
    } catch (error) {
      next(error);
    }
  }

  async deleteDish(req, res, next) {
    try {
      await Dish.findByIdAndDelete(req.params.id);
      return sendSuccess(res, {}, 'Plat supprime avec succes');
    } catch (error) {
      next(error);
    }
  }

  // CATEGORIES
  async getCategories(req, res, next) {
    try {
      const categories = await menuService.getCategories(false);
      return sendSuccess(res, { categories }, 'Categories recuperees');
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req, res, next) {
    try {
      const category = await menuService.createCategory(req.body, req.user.id);
      return sendSuccess(res, { category }, 'Categorie creee avec succes', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req, res, next) {
    try {
      const category = await menuService.updateCategory(req.params.id, req.body, req.user.id);
      return sendSuccess(res, { category }, 'Categorie mise a jour');
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      await Category.findByIdAndDelete(req.params.id);
      return sendSuccess(res, {}, 'Categorie supprimee');
    } catch (error) {
      next(error);
    }
  }

  // COMMANDES (ORDERS)
  async getOrders(req, res, next) {
    try {
      const { status, driverId, search, date, page = 1, limit = 20 } = req.query;
      const { orders, total } = await orderService.getAdminOrders({ status, driverId, search, date, page, limit });
      return sendPaginated(res, orders, { total, page, limit }, 'Commandes recuperees');
    } catch (error) {
      next(error);
    }
  }

  async getOrderById(req, res, next) {
    try {
      const order = await Order.findById(req.params.id).populate('driverId', 'firstName lastName phone');
      return sendSuccess(res, { order }, 'Details de la commande charges');
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
      return sendSuccess(res, { order }, 'Statut de commande mis a jour avec succes');
    } catch (error) {
      next(error);
    }
  }

  // LIVREURS (DRIVERS)
  async getDrivers(req, res, next) {
    try {
      const drivers = await settingsService.getAllDrivers();
      return sendSuccess(res, { drivers }, 'Livreurs recuperes');
    } catch (error) {
      next(error);
    }
  }

  async createDriver(req, res, next) {
    try {
      const driver = await settingsService.createDriver(req.body, req.user.id);
      return sendSuccess(res, { driver }, 'Compte livreur cree avec succes', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateDriver(req, res, next) {
    try {
      const driver = await settingsService.updateDriver(req.params.id, req.body, req.user.id);
      return sendSuccess(res, { driver }, 'Compte livreur mis a jour');
    } catch (error) {
      next(error);
    }
  }

  // PARAMETRES (SETTINGS)
  async getSettings(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      return sendSuccess(res, { settings }, 'Parametres charges');
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const settings = await settingsService.updateSettings(req.body, req.user.id);
      return sendSuccess(res, { settings }, 'Parametres mis a jour');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
