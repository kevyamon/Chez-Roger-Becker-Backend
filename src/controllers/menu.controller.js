/**
 * Controleur pour les ressources publiques du menu (MenuController).
 * Expose les categories, les plats, les offres promotionnelles et les infos du restaurant.
 */

const menuService = require('../services/menu.service');
const settingsService = require('../services/settings.service');
const { sendSuccess } = require('../utils/responseHelper');

class MenuController {
  async getCategories(req, res, next) {
    try {
      const categories = await menuService.getCategories(true);
      return sendSuccess(res, { categories }, 'Categories recuperees avec succes');
    } catch (error) {
      next(error);
    }
  }

  async getDishes(req, res, next) {
    try {
      const { categoryId, category, type, search, isFeatured } = req.query;
      const dishes = await menuService.getPublicDishes({ categoryId, category, type, search, isFeatured });
      return sendSuccess(res, { dishes }, 'Plats recuperes avec succes');
    } catch (error) {
      next(error);
    }
  }

  async getDishBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const dish = await menuService.getDishBySlug(slug);
      return sendSuccess(res, { dish }, 'Details du plat recuperes avec succes');
    } catch (error) {
      next(error);
    }
  }

  async getPromotions(req, res, next) {
    try {
      const promotions = await menuService.getActivePromotions();
      return sendSuccess(res, { promotions }, 'Promotions actives recuperees avec succes');
    } catch (error) {
      next(error);
    }
  }

  async getRestaurantInfo(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      return sendSuccess(res, { restaurant: settings }, 'Informations du restaurant recuperees avec succes');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MenuController();
