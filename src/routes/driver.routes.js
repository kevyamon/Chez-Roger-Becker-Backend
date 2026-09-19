/**
 * Routes dédiées aux livreurs (/api/v1/driver).
 * Protégées par authentification et rôle DRIVER strict.
 */

const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const { authenticate, requireDriver } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const {
  updateDriverStatusSchema,
  updateDriverProfileSchema,
  changePasswordSchema
} = require('../validators/auth.validator');

// Protection globale de l'espace livreur
router.use(authenticate, requireDriver);

// Tableau de bord et statistiques
router.get('/dashboard', driverController.getDashboard);
router.get('/stats', driverController.getStats);

// Commandes disponibles et courses en cours
router.get('/orders/available', driverController.getAvailableOrders);
router.get('/orders', driverController.getMyOrders);

// Actions séquentielles sur une livraison
router.post('/orders/:id/accept', driverController.acceptOrder);
router.post('/orders/:id/picked-up', driverController.confirmPickup);
router.post('/orders/:id/out-for-delivery', driverController.startDelivery);
router.post('/orders/:id/delivered', driverController.confirmDelivered);

// Mise à jour de la disponibilité
router.patch('/status', validateRequest(updateDriverStatusSchema), driverController.updateStatus);

// Profil et sécurité du livreur
router.patch('/profile', validateRequest(updateDriverProfileSchema), driverController.updateProfile);
router.patch('/change-password', validateRequest(changePasswordSchema), driverController.changePassword);

// Historique des livraisons effectuées
router.get('/history', driverController.getHistory);

module.exports = router;
