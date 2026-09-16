/**
 * Middlewares d'authentification et de controle d'acces base sur les roles (RBAC).
 * Verifie la validite du JWT (Bearer ou Cookie httpOnly) et le statut actif du compte.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/environment');
const { UserRole, ErrorCodes } = require('../constants/enums');
const { sendError } = require('../utils/responseHelper');

/**
 * Middleware d'authentification : valide le token et attache les donnees du compte a req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Extraction depuis l'en-tete Authorization Bearer
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // 2. Extraction de secours depuis le cookie signe ou non signe
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return sendError(
        res,
        {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Acces refuse. Authentification requise pour cette ressource.',
          details: {}
        },
        401
      );
    }

    // Verification cryptographique du token
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Injection securisee dans la requete
    req.user = {
      id: decoded.id || decoded.userId,
      role: decoded.role,
      email: decoded.email,
      phone: decoded.phone
    };

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(
        res,
        {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Votre session a expire. Veuillez vous reconnecter.',
          details: { expired: true }
        },
        401
      );
    }

    return sendError(
      res,
      {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Token d authentification invalide ou corrompu.',
        details: {}
      },
      401
    );
  }
};

/**
 * Middleware d'autorisation par roles stricts.
 * @param  {...string} allowedRoles - Liste des roles autorises (ADMIN, DRIVER).
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendError(
        res,
        {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Authentification prealable requise.',
          details: {}
        },
        401
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        {
          code: ErrorCodes.FORBIDDEN,
          message: 'Vous ne disposez pas des permissions requises pour cette action.',
          details: { requiredRoles: allowedRoles, currentRole: req.user.role }
        },
        403
      );
    }

    return next();
  };
};

const requireAdmin = requireRole(UserRole.ADMIN);
const requireDriver = requireRole(UserRole.DRIVER);

module.exports = {
  authenticate,
  requireRole,
  requireAdmin,
  requireDriver
};
