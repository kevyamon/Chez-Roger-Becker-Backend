/**
 * Service de gestion des paramètres du restaurant, indicateurs KPI et livreurs (SettingsService).
 */

const bcrypt = require('bcryptjs');
const RestaurantSettings = require('../models/restaurantSettings.model');
const Order = require('../models/order.model');
const DailyStat = require('../models/dailyStat.model');
const User = require('../models/user.model');
const AuditLog = require('../models/auditLog.model');
const { checkIsRestaurantOpen } = require('../utils/scheduleHelper');
const { OrderStatus, UserRole, ErrorCodes } = require('../constants/enums');

class SettingsService {
  async getSettings() {
    const settings = await RestaurantSettings.getSettings();
    const status = checkIsRestaurantOpen(settings);
    return {
      ...settings.toObject(),
      isEffectivelyOpen: status.isOpen,
      statusText: status.statusText,
      statusReason: status.reason
    };
  }

  async updateSettings(data, actorId) {
    let settings = await RestaurantSettings.findOne();
    if (!settings) {
      settings = await RestaurantSettings.create(data);
    } else {
      Object.assign(settings, data);
      await settings.save();
    }

    await AuditLog.create({
      action: 'RESTAURANT_SETTINGS_UPDATED',
      actorId,
      actorRole: 'ADMIN',
      targetModel: 'RestaurantSettings',
      targetId: settings._id.toString(),
      details: data
    });

    const status = checkIsRestaurantOpen(settings);
    return {
      ...settings.toObject(),
      isEffectivelyOpen: status.isOpen,
      statusText: status.statusText,
      statusReason: status.reason
    };
  }

  /**
   * Calcul des indicateurs clés de performance (KPI) pour le Dashboard Admin.
   */
  async getDashboardKPIs() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      ordersToday,
      ordersWeek,
      pendingCount,
      preparingCount,
      inDeliveryCount,
      deliveredCount,
      cancelledCount,
      recentOrders,
      financialsToday,
      financialsWeek
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: startOfToday } }),
      Order.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Order.countDocuments({ status: OrderStatus.PENDING }),
      Order.countDocuments({ status: { $in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP] } }),
      Order.countDocuments({ status: { $in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY] } }),
      Order.countDocuments({ status: OrderStatus.DELIVERED }),
      Order.countDocuments({ status: OrderStatus.CANCELLED }),
      Order.find()
        .populate('driverId', 'firstName lastName phone')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfToday }, status: { $ne: OrderStatus.CANCELLED } } },
        { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfWeek }, status: { $ne: OrderStatus.CANCELLED } } },
        { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
      ])
    ]);

    return {
      kpi: {
        ordersToday,
        ordersWeek,
        revenueToday: financialsToday[0]?.totalRevenue || 0,
        revenueWeek: financialsWeek[0]?.totalRevenue || 0,
        pendingCount,
        preparingCount,
        inDeliveryCount,
        deliveredCount,
        cancelledCount
      },
      recentOrders
    };
  }

  // --- GESTION DES LIVREURS (ADMIN) ---
  async getAllDrivers() {
    return User.find({ role: UserRole.DRIVER })
      .select('-passwordHash -refreshTokenHash')
      .sort({ createdAt: -1 })
      .lean();
  }

  async createDriver(driverData, actorId) {
    const existing = await User.findOne({
      $or: [{ email: driverData.email.toLowerCase() }, { phone: driverData.phone }]
    });

    if (existing) {
      const error = new Error('Un compte livreur avec cet e-mail ou ce téléphone existe déjà.');
      error.statusCode = 409;
      error.code = ErrorCodes.CONFLICT;
      throw error;
    }

    const driver = await User.create({
      ...driverData,
      role: UserRole.DRIVER,
      passwordHash: driverData.password
    });

    await AuditLog.create({
      action: 'DRIVER_CREATED',
      actorId,
      actorRole: 'ADMIN',
      targetModel: 'User',
      targetId: driver._id.toString(),
      details: { name: `${driver.firstName} ${driver.lastName}`, phone: driver.phone }
    });

    return driver;
  }

  async updateDriver(id, updateData, actorId) {
    if (updateData.password) {
      const salt = await bcrypt.genSalt(12);
      updateData.passwordHash = await bcrypt.hash(updateData.password, salt);
      delete updateData.password;
    }

    const driver = await User.findOneAndUpdate(
      { _id: id, role: UserRole.DRIVER },
      updateData,
      { new: true, runValidators: true }
    );

    if (!driver) {
      const error = new Error('Livreur introuvable.');
      error.statusCode = 404;
      error.code = ErrorCodes.NOT_FOUND;
      throw error;
    }

    await AuditLog.create({
      action: 'DRIVER_UPDATED',
      actorId,
      actorRole: 'ADMIN',
      targetModel: 'User',
      targetId: id,
      details: updateData
    });

    return driver;
  }

  // --- JOURNAL D'AUDIT (AUDIT LOGS) ---
  async getAuditLogs({ page = 1, limit = 30, action, actorId } = {}) {
    const query = {};
    if (action) query.action = action;
    if (actorId) query.actorId = actorId;

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actorId', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return { logs, total, page, limit };
  }

  // --- HISTORIQUE DÉDIÉ DES COMMANDES LIVRÉES / TERMINÉES ---
  async getCompletedOrdersHistory({ page = 1, limit = 20, search, date } = {}) {
    const query = { status: { $in: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] } };
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search.trim(), $options: 'i' } },
        { 'customer.name': { $regex: search.trim(), $options: 'i' } },
        { 'customer.phone': { $regex: search.trim(), $options: 'i' } }
      ];
    }
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('driverId', 'firstName lastName phone')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(query)
    ]);

    return { orders, total, page, limit };
  }
}

module.exports = new SettingsService();
