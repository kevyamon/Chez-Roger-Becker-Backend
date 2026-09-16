/**
 * Routes dediees aux livreurs (/api/v1/driver).
 */

const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const { authenticate, requireDriver } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const { updateDriverStatusSchema } = require('../validators/auth.validator');

// Protection globale de l'espace livreur
router.use(authenticate, requireDriver);

// Tableau de bord livreur
router.get('/dashboard', driverController.getDashboard);

// Commandes disponibles et courses en cours
router.get('/orders/available', driverController.getAvailableOrders);
router.get('/orders', driverController.getMyOrders);

// Actions sur une livraison
router.post('/orders/:id/accept', driverController.acceptOrder);
router.post('/orders/:id/picked-up', driverController.confirmPickup);
router.post('/orders/:id/out-for-delivery', driverController.startDelivery);
router.post('/orders/:id/delivered', driverController.confirmDelivered);

// Mise a jour du statut de disponibilite
router.patch('/status', validateRequest(updateDriverStatusSchema), driverController.updateStatus);

// Historique des livraisons effectuees
router.get('/history', driverController.getHistory);

module.exports = router;
