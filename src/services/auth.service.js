/**
 * Service d'authentification et de gestion des sessions (Admin et Livreurs).
 * Implémente le standard de sécurité Yély : HS256 forcé, jti unique et rotation Bcrypt.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const AuditLog = require('../models/auditLog.model');
const env = require('../config/environment');
const { UserRole, ErrorCodes } = require('../constants/enums');
const { generateJti } = require('../utils/tokenGenerator');

class AuthService {
  /**
   * Génère une paire de jetons cryptographiques (Access Token + Refresh Token).
   * @param {Object} user - Document utilisateur MongoDB.
   */
  generateTokens(user) {
    const accessPayload = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      phone: user.phone,
      type: 'access'
    };

    const accessToken = jwt.sign(accessPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN || '15m',
      algorithm: 'HS256'
    });

    const refreshPayload = {
      id: user._id.toString(),
      jti: generateJti(),
      type: 'refresh'
    };

    const refreshToken = jwt.sign(refreshPayload, env.REFRESH_TOKEN_SECRET, {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN || '30d',
      algorithm: 'HS256'
    });

    return { accessToken, refreshToken };
  }

  /**
   * Connexion administrateur ou livreur par e-mail ou téléphone.
   */
  async login({ identifier, password, ipAddress }) {
    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase().trim() }, { phone: identifier.trim() }],
      isActive: true
    }).select('+passwordHash +refreshTokenHash');

    if (!user) {
      const error = new Error('Identifiant ou mot de passe incorrect.');
      error.statusCode = 401;
      error.code = ErrorCodes.UNAUTHORIZED;
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Identifiant ou mot de passe incorrect.');
      error.statusCode = 401;
      error.code = ErrorCodes.UNAUTHORIZED;
      throw error;
    }

    const { accessToken, refreshToken } = this.generateTokens(user);

    const salt = await bcrypt.genSalt(12);
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
   * Inscription d'un compte Administrateur protégé par clé privée.
   */
  async registerAdmin({ name, email, phone, password, privateKey, ipAddress }) {
    const expectedKey = (env.AD_PW || '').trim();
    const providedKey = (privateKey || '').trim();

    if (!providedKey || providedKey !== expectedKey) {
      const error = new Error('Clé privée d\'administration invalide ou non autorisée.');
      error.statusCode = 403;
      error.code = ErrorCodes.FORBIDDEN;
      throw error;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.trim();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }]
    });

    if (existingUser) {
      const error = new Error('Un utilisateur avec cette adresse e-mail ou ce numéro existe déjà.');
      error.statusCode = 409;
      error.code = ErrorCodes.CONFLICT;
      throw error;
    }

    const nameParts = (name || '').trim().split(' ');
    const firstName = nameParts[0] || 'Admin';
    const lastName = nameParts.slice(1).join(' ') || 'Principal';

    const user = new User({
      firstName,
      lastName,
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash: password,
      role: UserRole.ADMIN,
      isActive: true,
      lastLoginAt: new Date()
    });

    const { accessToken, refreshToken } = this.generateTokens(user);

    const salt = await bcrypt.genSalt(12);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, salt);
    await user.save();

    try {
      await AuditLog.create({
        action: 'ADMIN_REGISTER',
        actorId: user._id,
        actorRole: UserRole.ADMIN,
        targetModel: 'USER',
        targetId: user._id.toString(),
        details: { email: user.email },
        ipAddress: ipAddress || ''
      });
    } catch (auditErr) {
      console.error('[AuditLog Error]', auditErr.message);
    }

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken
    };
  }

  /**
   * Rafraîchissement sécurisé d'access token avec rotation et anti-collision.
   */
  async refreshToken(token) {
    if (!token) {
      const error = new Error('Session expirée ou jeton de rafraîchissement manquant.');
      error.statusCode = 401;
      error.code = ErrorCodes.UNAUTHORIZED;
      throw error;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET, { algorithms: ['HS256'] });
    } catch (err) {
      const error = new Error('Session expirée ou jeton de rafraîchissement invalide.');
      error.statusCode = 401;
      error.code = ErrorCodes.UNAUTHORIZED;
      throw error;
    }

    if (decoded.type !== 'refresh') {
      const error = new Error('Type de jeton invalide pour cette opération.');
      error.statusCode = 401;
      error.code = ErrorCodes.UNAUTHORIZED;
      throw error;
    }

    const user = await User.findById(decoded.id).select('+refreshTokenHash');
    if (!user || !user.isActive || !user.refreshTokenHash) {
      const error = new Error('Session invalide ou compte inactif.');
      error.statusCode = 401;
      error.code = ErrorCodes.UNAUTHORIZED;
      throw error;
    }

    const isTokenMatch = await bcrypt.compare(token, user.refreshTokenHash);
    if (!isTokenMatch) {
      user.refreshTokenHash = null;
      await user.save();
      const error = new Error('Tentative de réutilisation de session détectée. Veuillez vous reconnecter.');
      error.statusCode = 401;
      error.code = ErrorCodes.UNAUTHORIZED;
      throw error;
    }

    const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(user);
    const salt = await bcrypt.genSalt(12);
    user.refreshTokenHash = await bcrypt.hash(newRefreshToken, salt);
    await user.save();

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken: newRefreshToken
    };
  }

  /**
   * Déconnexion et révocation explicite du jeton en base de données.
   */
  async logout(userId) {
    if (!userId) return;
    await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
  }

  /**
   * Récupération du profil de l'utilisateur connecté.
   */
  async getMe(userId) {
    const user = await User.findById(userId).lean();
    if (!user || !user.isActive) {
      const error = new Error('Compte utilisateur introuvable ou désactivé.');
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
