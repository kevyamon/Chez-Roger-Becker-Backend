/**
 * Routes publiques du restaurant et du menu (/api/v1).
 */

const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menu.controller');

// Categories de plats
router.get('/categories', menuController.getCategories);

// Plats et recherche
router.get('/dishes', menuController.getDishes);
router.get('/dishes/:slug', menuController.getDishBySlug);

// Promotions et offres actives
router.get('/promotions', menuController.getPromotions);

// Informations et statut d'ouverture du restaurant
router.get('/restaurant', menuController.getRestaurantInfo);

module.exports = router;
