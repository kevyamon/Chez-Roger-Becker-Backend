/**
 * Routes de commandes publiques (/api/v1/orders).
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { validateRequest } = require('../middleware/validateRequest');
const { createOrderSchema } = require('../validators/order.validator');
const { orderLimiter } = require('../middleware/rateLimiter');

// Creation d'une nouvelle commande (checkout sans compte avec protection rate-limit)
router.post('/', orderLimiter, validateRequest(createOrderSchema), orderController.createOrder);

// Suivi d'une commande via son token securise
router.get('/track/:token', orderController.trackOrder);

module.exports = router;
