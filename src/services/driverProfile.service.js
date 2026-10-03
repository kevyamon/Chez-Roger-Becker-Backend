/**
 * Service de gestion du profil, de la sécurité et des statistiques des livreurs (DriverProfileService).
 * Règle Forteresse : Découpage modulaire (< 270 lignes), hachage Bcrypt 12 rounds et intégrité des données.
 */

const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Order = require('../models/order.model');
const { OrderStatus } = require('../constants/enums');

class DriverProfileService {
  /**
   * Calcul des statistiques opérationnelles et des encaissements en espèces du livreur.
   */
  async getDriverStats(driverId) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [todayOrders, totalOrders, todayFinancials, totalFinancials] = await Promise.all([
      Order.countDocuments({ driverId, status: OrderStatus.DELIVERED, updatedAt: { $gte: startOfToday } }),
      Order.countDocuments({ driverId, status: OrderStatus.DELIVERED }),
      Order.aggregate([
        { $match: { driverId, status: OrderStatus.DELIVERED, updatedAt: { $gte: startOfToday } } },
        { $group: { _id: null, totalCash: { $sum: '$total' } } }
      ]),
      Order.aggregate([
        { $match: { driverId, status: OrderStatus.DELIVERED } },
        { $group: { _id: null, totalCash: { $sum: '$total' } } }
      ])
    ]);

    return {
      todayDeliveries: todayOrders,
      totalDeliveries: totalOrders,
      todayCashCollected: todayFinancials[0]?.totalCash || 0,
      totalCashCollected: totalFinancials[0]?.totalCash || 0
    };
  }

  /**
   * Mise à jour des informations personnelles du livreur.
   */
  async updateProfile(driverId, { firstName, lastName, phone, email }) {
    const updates = {};
    if (firstName) updates.firstName = firstName.trim();
    if (lastName) updates.lastName = lastName.trim();

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: driverId } });
      if (existing) {
        const error = new Error('Cette adresse e-mail est déjà utilisée par un autre compte.');
        error.statusCode = 409;
        throw error;
      }
      updates.email = normalizedEmail;
    }

    if (phone) {
      const normalizedPhone = phone.trim();
      const existing = await User.findOne({ phone: normalizedPhone, _id: { $ne: driverId } });
      if (existing) {
        const error = new Error('Ce numéro de téléphone est déjà utilisé.');
        error.statusCode = 409;
        throw error;
      }
      updates.phone = normalizedPhone;
    }

    const updatedUser = await User.findByIdAndUpdate(driverId, updates, { new: true, runValidators: true });
    return updatedUser ? updatedUser.toJSON() : null;
  }

  /**
   * Changement sécurisé du mot de passe avec Bcrypt 12 rounds.
   */
  async changePassword(driverId, { oldPassword, newPassword }) {
    const user = await User.findById(driverId).select('+passwordHash');
    if (!user) {
      const error = new Error('Compte livreur introuvable.');
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      const error = new Error('Le mot de passe actuel est incorrect.');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return { message: 'Mot de passe modifié avec succès.' };
  }
}

module.exports = new DriverProfileService();
