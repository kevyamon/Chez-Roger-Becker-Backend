/**
 * Routes de gestion des abonnements aux notifications push (/api/v1/notifications).
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const env = require('../config/environment');
const notificationController = require('../controllers/notification.controller');
const { validateRequest } = require('../middleware/validateRequest');
const {
  subscribeSchema,
  linkOrderSchema,
  unsubscribeSchema
} = require('../validators/notification.validator');

/**
 * Middleware d'authentification optionnelle : injecte req.user si un jeton valide est fourni.
 */
const optionalAuthenticate = (req, res, next) => {
  try {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = {
        id: decoded.id || decoded.userId,
        role: decoded.role,
        email: decoded.email,
        phone: decoded.phone
      };
    }
  } catch (err) {
    // Ignorer si le jeton est manquant ou expiré (mode public/client)
  }
  return next();
};

router.post('/subscribe', optionalAuthenticate, validateRequest(subscribeSchema), notificationController.subscribe);
router.post('/link-order', validateRequest(linkOrderSchema), notificationController.linkOrder);
router.post('/unsubscribe', validateRequest(unsubscribeSchema), notificationController.unsubscribe);

module.exports = router;
