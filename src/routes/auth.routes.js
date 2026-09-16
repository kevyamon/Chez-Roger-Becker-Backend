/**
 * Routes d'authentification (/api/v1/auth).
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateRequest } = require('../middleware/validateRequest');
const { loginSchema } = require('../validators/auth.validator');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/authMiddleware');

// Connexion securisee avec limitation de tentatives
router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);

// Deconnexion et invalidation de session
router.post('/logout', authenticate, authController.logout);

// Recuperation du profil connecte
router.get('/me', authenticate, authController.getMe);

module.exports = router;
