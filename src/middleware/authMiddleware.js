/**
 * Middlewares d'authentification et de contrôle d'accès basé sur les rôles (RBAC).
 * Vérifie la validité du JWT d'accès (Bearer ou Cookie httpOnly) et son typage strict.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/environment');
const { UserRole, ErrorCodes } = require('../constants/enums');
const { sendError } = require('../utils/responseHelper');

/**
 * Middleware d'authentification : valide le jeton d'accès et injecte l'utilisateur dans req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Extraction prioritaire depuis l'en-tête Authorization Bearer
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2. Extraction de secours depuis le cookie httpOnly
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return sendError(
        res,
        {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Accès refusé. Authentification requise pour cette ressource.',
          details: {}
        },
        401
      );
    }

    // Vérification cryptographique stricte (algorithme HS256 forcé)
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });

    // Contrôle strict du type de jeton (interdit l'utilisation d'un refreshToken comme accessToken)
    if (decoded.type && decoded.type !== 'access') {
      return sendError(
        res,
        {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Type de jeton invalide pour cette ressource.',
          details: {}
        },
        401
      );
    }

    // Injection sécurisée dans la requête courante
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
          message: 'Votre session a expiré. Renouvellement requis.',
          details: { expired: true }
        },
        401
      );
    }

    return sendError(
      res,
      {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Jeton d\'authentification invalide ou corrompu.',
        details: {}
      },
      401
    );
  }
};

/**
 * Middleware d'autorisation par rôles stricts.
 * @param  {...string} allowedRoles - Liste des rôles autorisés (ADMIN, DRIVER).
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendError(
        res,
        {
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Authentification préalable requise.',
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
