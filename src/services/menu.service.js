/**
 * Service de gestion du menu, des categories, des plats et des promotions.
 */

const Category = require('../models/category.model');
const Dish = require('../models/dish.model');
const Promotion = require('../models/promotion.model');
const AuditLog = require('../models/auditLog.model');
const { ErrorCodes } = require('../constants/enums');

class MenuService {
  // --- CATEGORIES ---
  async getCategories(onlyActive = true) {
    const filter = onlyActive ? { isActive: true } : {};
    return Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  }

  async createCategory(data, actorId) {
    const category = await Category.create(data);
    await AuditLog.create({
      action: 'CATEGORY_CREATED',
      actorId,
      actorRole: 'ADMIN',
      targetModel: 'Category',
      targetId: category._id.toString(),
      details: { name: category.name }
    });
    return category;
  }

  async updateCategory(id, data, actorId) {
    const category = await Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!category) {
      const error = new Error('Catégorie introuvable');
      error.statusCode = 404;
      error.code = ErrorCodes.NOT_FOUND;
      throw error;
    }
    await AuditLog.create({
      action: 'CATEGORY_UPDATED',
      actorId,
      actorRole: 'ADMIN',
      targetModel: 'Category',
      targetId: id,
      details: data
    });
    return category;
  }

  async deleteCategory(id, actorId) {
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      const error = new Error('Catégorie introuvable');
      error.statusCode = 404;
      error.code = ErrorCodes.NOT_FOUND;
      throw error;
    }
    await AuditLog.create({
      action: 'CATEGORY_DELETED',
      actorId,
      actorRole: 'ADMIN',
      targetModel: 'Category',
      targetId: id,
      details: { name: category.name }
    });
    return category;
  }

  // --- PLATS (DISHES) ---
  async getPublicDishes({ categoryId, category, type, search, isFeatured }) {
    const query = { isAvailable: true };
    if (categoryId) query.categoryId = categoryId;
    if (category) query.category = category;
    if (type) query.type = type;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === true || isFeatured === 'true';
    if (search && search.trim()) {
      query.$text = { $search: search.trim() };
    }
    return Dish.find(query)
      .populate('categoryId', 'name slug')
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
  }

  async getDishBySlug(slug) {
    const dish = await Dish.findOne({ slug, isAvailable: true })
      .populate('categoryId', 'name slug')
      .lean();
    if (!dish) {
      const error = new Error('Plat introuvable ou indisponible');
      error.statusCode = 404;
      error.code = ErrorCodes.NOT_FOUND;
      throw error;
    }
    return dish;
  }

  async getAdminDishes({ categoryId, category, type, isAvailable, search, page = 1, limit = 20 }) {
    const query = {};
    if (categoryId) query.categoryId = categoryId;
    if (category) query.category = category;
    if (type) query.type = type;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true' || isAvailable === true;
    if (search && search.trim()) query.$text = { $search: search.trim() };

    const skip = (Number(page) - 1) * Number(limit);
    const [dishes, total] = await Promise.all([
      Dish.find(query)
        .populate('categoryId', 'name slug')
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Dish.countDocuments(query)
    ]);
    return { dishes, total, page, limit };
  }

  async createDish(data, actorId) {
    const dish = await Dish.create(data);
    await AuditLog.create({
      action: 'DISH_CREATED',
      actorId,
      actorRole: 'ADMIN',
      targetModel: 'Dish',
      targetId: dish._id.toString(),
      details: { name: dish.name, price: dish.price }
    });
    return dish;
  }

  async updateDish(id, data, actorId) {
    const dish = await Dish.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!dish) {
      const error = new Error('Plat introuvable');
      error.statusCode = 404;
      error.code = ErrorCodes.NOT_FOUND;
      throw error;
    }
    await AuditLog.create({
      action: 'DISH_UPDATED',
      actorId,
      actorRole: 'ADMIN',
      targetModel: 'Dish',
      targetId: id,
      details: data
    });
    return dish;
  }

  async deleteDish(id, actorId) {
    const dish = await Dish.findByIdAndDelete(id);
    if (!dish) {
      const error = new Error('Plat introuvable');
      error.statusCode = 404;
      error.code = ErrorCodes.NOT_FOUND;
      throw error;
    }
    await AuditLog.create({
      action: 'DISH_DELETED',
      actorId,
      actorRole: 'ADMIN',
      targetModel: 'Dish',
      targetId: id,
      details: { name: dish.name }
    });
    return dish;
  }

  // --- PROMOTIONS ---
  async getActivePromotions() {
    const now = new Date();
    return Promotion.find({
      isActive: true,
      startDate: { $lte: now },
      $or: [{ endDate: null }, { endDate: { $gte: now } }]
    })
      .populate('dishId', 'name slug price promotionalPrice image')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getAdminPromotions({ page = 1, limit = 20 } = {}) {
    const skip = (Number(page) - 1) * Number(limit);
    const [promotions, total] = await Promise.all([
      Promotion.find()
        .populate('dishId', 'name price image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Promotion.countDocuments()
    ]);
    return { promotions, total, page, limit };
  }

  async createPromotion(data, actorId) {
    const promo = await Promotion.create(data);
    await AuditLog.create({
      action: 'PROMOTION_CREATED',
      actorId,
      actorRole: 'ADMIN',
      targetModel: 'Promotion',
      targetId: promo._id.toString(),
      details: { title: promo.title }
    });
    return promo;
  }

  async updatePromotion(id, data, actorId) {
    const promo = await Promotion.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!promo) {
      const error = new Error('Promotion introuvable');
      error.statusCode = 404;
      error.code = ErrorCodes.NOT_FOUND;
      throw error;
    }
    await AuditLog.create({
      action: 'PROMOTION_UPDATED',
      actorId,
      actorRole: 'ADMIN',
      targetModel: 'Promotion',
      targetId: id,
      details: data
    });
    return promo;
  }

  async deletePromotion(id, actorId) {
    const promo = await Promotion.findByIdAndDelete(id);
    if (!promo) {
      const error = new Error('Promotion introuvable');
      error.statusCode = 404;
      error.code = ErrorCodes.NOT_FOUND;
      throw error;
    }
    await AuditLog.create({
      action: 'PROMOTION_DELETED',
      actorId,
      actorRole: 'ADMIN',
      targetModel: 'Promotion',
      targetId: id,
      details: { title: promo.title }
    });
    return promo;
  }
}

module.exports = new MenuService();
