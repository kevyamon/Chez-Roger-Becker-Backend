/**
 * Service d'authentification et de gestion des comptes (Admin et Livreurs).
 * Gere la generation de tokens JWT, la rotation des refresh tokens et la securite des identifiants.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const AuditLog = require('../models/auditLog.model');
const env = require('../config/environment');
const { UserRole, DriverStatus, ErrorCodes } = require('../constants/enums');

class AuthService {
  /**
   * Genere une paire de tokens (Access Token + Refresh Token).
   */
  generateTokens(user) {
    const payload = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      phone: user.phone
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN
    });

    const refreshToken = jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN
    });

    return { accessToken, refreshToken };
  }

  /**
   * Connexion administrateur ou livreur par e-mail ou telephone.
   */
  async login({ identifier, password, ipAddress }) {
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase().trim() }, { phone: identifier.trim() }],
      isActive: true
    }).select('+passwordHash +refreshTokenHash');

    if (!user) {
      const error = new Error('Identifiant ou mot de passe incorrect');
      error.statusCode = 401;
      error.code = ErrorCodes.UNAUTHORIZED;
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Identifiant ou mot de passe incorrect');
      error.statusCode = 401;
      error.code = ErrorCodes.UNAUTHORIZED;
      throw error;
    }

    const { accessToken, refreshToken } = this.generateTokens(user);

    // Stockage hache du refresh token pour rotation securisee
    const salt = await bcrypt.genSalt(10);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, salt);
    user.lastLoginAt = new Date();
    await user.save();

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken
    };
  }

  /**
   * Deconnexion et invalidation du refresh token.
   */
  async logout(userId) {
    await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
  }

  /**
   * Recuperation du profil connecte actuel.
   */
  async getMe(userId) {
    const user = await User.findById(userId).lean();
    if (!user || !user.isActive) {
      const error = new Error('Compte introuvable ou desactive');
      error.statusCode = 404;
      error.code = ErrorCodes.NOT_FOUND;
      throw error;
    }
    delete user.passwordHash;
    delete user.refreshTokenHash;
    return user;
  }
}

module.exports = new AuthService();
