/**
 * Middlewares de limitation de debit (Rate-Limiting) pour proteger l'API.
 * Protege contre le brute-force, le flood de requetes et les attaques par deni de service (DoS).
 */

const rateLimit = require('express-rate-limit');
const { ErrorCodes } = require('../constants/enums');
const { sendError } = require('../utils/responseHelper');

const createLimiter = ({ windowMs, max, message }) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, trustProxy: false },
    handler: (req, res) => {
      return sendError(
        res,
        {
          code: ErrorCodes.RATE_LIMIT_EXCEEDED,
          message,
          details: { retryAfter: Math.ceil(windowMs / 1000) }
        },
        429
      );
    }
  });
};

// Limiteur global pour l'ensemble des routes publiques (300 requêtes par 15 min)
const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Trop de requêtes depuis cette adresse IP. Veuillez réessayer dans quelques minutes.'
});

// Limiteur strict pour les routes d'authentification (10 tentatives par 15 min)
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Trop de tentatives de connexion infructueuses. Votre accès est temporairement bloqué pendant 15 minutes.'
});

// Limiteur pour la création de commande (15 commandes par 15 min par IP)
const orderLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Trop de commandes initiées en peu de temps. Veuillez patienter avant de renouveler l\'opération.'
});

module.exports = {
  globalLimiter,
  authLimiter,
  orderLimiter
};
