/**
 * Routes dédiées à l'administration du restaurant (/api/v1/admin).
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const { uploadImageMiddleware } = require('../middleware/upload');
const { createCategorySchema, updateCategorySchema, createDishSchema, updateDishSchema, createPromotionSchema, updatePromotionSchema } = require('../validators/menu.validator');
const { createDriverSchema, updateDriverSchema } = require('../validators/auth.validator');
const { updateOrderStatusSchema, updateSettingsSchema } = require('../validators/order.validator');

// Protection absolue de l'espace administration
router.use(authenticate, requireAdmin);

// Téléversement d'images sur Cloudinary (Galerie)
router.post('/upload', uploadImageMiddleware, adminController.uploadImage);

// Dashboard KPI
router.get('/dashboard', adminController.getDashboard);

// Gestion des plats
router.get('/dishes', adminController.getDishes);
router.post('/dishes', validateRequest(createDishSchema), adminController.createDish);
router.patch('/dishes/:id', validateRequest(updateDishSchema), adminController.updateDish);
router.delete('/dishes/:id', adminController.deleteDish);

// Gestion des catégories
router.get('/categories', adminController.getCategories);
router.post('/categories', validateRequest(createCategorySchema), adminController.createCategory);
router.patch('/categories/:id', validateRequest(updateCategorySchema), adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Gestion des commandes
router.get('/orders', adminController.getOrders);
router.get('/orders-history', adminController.getOrdersHistory);
router.get('/orders/:id', adminController.getOrderById);
router.patch('/orders/:id/status', validateRequest(updateOrderStatusSchema), adminController.updateOrderStatus);

// Gestion des livreurs
router.get('/drivers', adminController.getDrivers);
router.post('/drivers', validateRequest(createDriverSchema), adminController.createDriver);
router.patch('/drivers/:id', validateRequest(updateDriverSchema), adminController.updateDriver);

// Gestion des promotions
router.get('/promotions', adminController.getPromotions);
router.post('/promotions', validateRequest(createPromotionSchema), adminController.createPromotion);
router.patch('/promotions/:id', validateRequest(updatePromotionSchema), adminController.updatePromotion);
router.delete('/promotions/:id', adminController.deletePromotion);

// Paramètres du restaurant
router.get('/settings', adminController.getSettings);
router.patch('/settings', validateRequest(updateSettingsSchema), adminController.updateSettings);

// Journal d'audit (Audit Trail)
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
