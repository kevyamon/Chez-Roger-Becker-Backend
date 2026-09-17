/**
 * Middleware centralise de gestion des erreurs pour Chez Roger Becker.
 * Capture toutes les exceptions, normalise les formats de reponse et protege les donnees sensibles en production.
 */

const { ErrorCodes } = require('../constants/enums');
const { sendError } = require('../utils/responseHelper');
const env = require('../config/environment');

/**
 * Middleware principal de capture des erreurs Express (4 parametres obligatoires).
 */
const errorHandler = (err, req, res, next) => {
  // Journalisation controlee de l'erreur
  if (!env.isProduction) {
    console.error('[Error Handler]', err);
  } else {
    console.error(`[Error Handler] ${err.name || 'Error'}: ${err.message}`);
  }

  // 1. Erreur de syntaxe JSON dans le corps de la requête
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(
      res,
      {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Le corps de la requête contient un format JSON invalide.',
        details: {}
      },
      400
    );
  }

  // 2. Erreur Mongoose : Cast d'un ObjectId invalide
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return sendError(
      res,
      {
        code: ErrorCodes.VALIDATION_ERROR,
        message: `Identifiant invalide fourni pour le champ : ${err.path}.`,
        details: { [err.path]: 'Identifiant MongoDB invalide' }
      },
      400
    );
  }

  // 3. Erreur Mongoose : Clé dupliquée (ex: email ou slug existant)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'champ';
    return sendError(
      res,
      {
        code: ErrorCodes.CONFLICT,
        message: `Une ressource avec cette valeur existe déjà pour le champ : ${field}.`,
        details: { [field]: 'Valeur déjà utilisée' }
      },
      409
    );
  }

  // 4. Erreur Mongoose : Validation schéma
  if (err.name === 'ValidationError' && err.errors) {
    const details = {};
    Object.keys(err.errors).forEach((key) => {
      details[key] = err.errors[key].message;
    });
    return sendError(
      res,
      {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Erreur de validation de la base de données.',
        details
      },
      422
    );
  }

  // 5. Erreurs JWT (Token expiré ou invalide)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendError(
      res,
      {
        code: ErrorCodes.UNAUTHORIZED,
        message: err.name === 'TokenExpiredError' ? 'Votre session a expiré.' : 'Jeton d\'authentification invalide.',
        details: {}
      },
      401
    );
  }

  // 6. Erreurs métier personnalisées avec statusCode spécifique
  const statusCode = Number(err.statusCode) || 500;
  const errorCode = err.code || (statusCode === 500 ? ErrorCodes.INTERNAL_ERROR : ErrorCodes.VALIDATION_ERROR);
  const message = statusCode === 500 && env.isProduction 
    ? 'Une erreur interne inattendue est survenue.' 
    : (err.message || 'Une erreur est survenue.');

  return sendError(
    res,
    {
      code: errorCode,
      message,
      details: err.details || {}
    },
    statusCode
  );
};

/**
 * Middleware pour capturer les routes inexistantes (404).
 */
const notFoundHandler = (req, res) => {
  return sendError(
    res,
    {
      code: ErrorCodes.NOT_FOUND,
      message: `La route demandée ${req.method} ${req.originalUrl} n'existe pas.`,
      details: {}
    },
    404
  );
};

module.exports = {
  errorHandler,
  notFoundHandler
};
