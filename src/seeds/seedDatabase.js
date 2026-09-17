/**
 * Script de pre-remplissage des donnees de demonstration (Seeders).
 * Initialise l'administrateur, les livreurs, les categories et la carte des plats.
 */

const { connectDatabase, disconnectDatabase } = require('../config/database');
const User = require('../models/user.model');
const Category = require('../models/category.model');
const Dish = require('../models/dish.model');
const Promotion = require('../models/promotion.model');
const RestaurantSettings = require('../models/restaurantSettings.model');
const { UserRole, DriverStatus, PromotionType, DishCategory, DishType } = require('../constants/enums');

const seed = async () => {
  console.log('[Seed] Debut de l initialisation de la base de donnees...');
  await connectDatabase();

  // Nettoyage prealable
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Dish.deleteMany({}),
    Promotion.deleteMany({}),
    RestaurantSettings.deleteMany({})
  ]);

  // 1. Creation de l'administrateur
  const admin = await User.create({
    firstName: 'Roger',
    lastName: 'Becker',
    phone: '+2250701020304',
    email: 'admin@rogerbecker.com',
    passwordHash: 'AdminBecker2026!',
    role: UserRole.ADMIN,
    isActive: true
  });

  // 2. Creation des livreurs de demonstration
  const driver1 = await User.create({
    firstName: 'Kouame',
    lastName: 'Koffi',
    phone: '+2250705060708',
    email: 'kouame@rogerbecker.com',
    passwordHash: 'Livreur2026!',
    role: UserRole.DRIVER,
    driverStatus: DriverStatus.AVAILABLE,
    isActive: true
  });

  const driver2 = await User.create({
    firstName: 'Bakary',
    lastName: 'Toure',
    phone: '+2250709101112',
    email: 'bakary@rogerbecker.com',
    passwordHash: 'Livreur2026!',
    role: UserRole.DRIVER,
    driverStatus: DriverStatus.AVAILABLE,
    isActive: true
  });

  // 3. Creation des Categories (Normal, VIP, Spécial)
  const catNormal = await Category.create({
    name: 'Normal',
    description: 'Plats et grillades du quotidien savoureux',
    sortOrder: 1
  });

  const catVIP = await Category.create({
    name: 'VIP',
    description: 'Sélection gastronomique prestige pour grands événements',
    sortOrder: 2
  });

  const catSpecial = await Category.create({
    name: 'Spécial',
    description: 'Créations signatures du chef Roger Becker',
    sortOrder: 3
  });

  // 4. Creation des Plats
  const pouletBraise = await Dish.create({
    name: 'Poulet Braisé Maison (Entier)',
    description: 'Poulet fermier mariné aux épices secrètes de Roger, braisé au charbon de bois.',
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80',
    price: 5000,
    promotionalPrice: 4500,
    category: DishCategory.SPECIAL,
    type: DishType.FOOD,
    categoryId: catSpecial._id,
    isFeatured: true,
    sortOrder: 1,
    options: [{ name: 'Piment doux' }, { name: 'Piment fort' }]
  });

  await Dish.create({
    name: 'Poisson Carpe Braisée Royale',
    description: 'Belle carpe fraîche braisée, servie avec sa sauce oignon-tomate et piments frais.',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
    price: 6000,
    category: DishCategory.VIP,
    type: DishType.FOOD,
    categoryId: catVIP._id,
    isFeatured: true,
    sortOrder: 2
  });

  await Dish.create({
    name: 'Garba Royal au Thon Frit',
    description: 'Attiéké fin accompagné de darne de thon marinée et frite à point, tomates et piments.',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    price: 3500,
    category: DishCategory.NORMAL,
    type: DishType.FOOD,
    categoryId: catNormal._id,
    isFeatured: true,
    sortOrder: 1
  });

  await Dish.create({
    name: 'Portion d Alloco Doré',
    description: 'Bananes plantains mûres frites à l huile d arachide pure.',
    image: 'https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&w=800&q=80',
    price: 1000,
    category: DishCategory.NORMAL,
    type: DishType.FOOD,
    categoryId: catNormal._id,
    sortOrder: 1
  });

  await Dish.create({
    name: 'Attiéké Frais Garba',
    description: 'Semoule de manioc cuite à la vapeur, légère et aérée.',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
    price: 500,
    category: DishCategory.NORMAL,
    type: DishType.FOOD,
    categoryId: catNormal._id,
    sortOrder: 2
  });

  await Dish.create({
    name: 'Jus de Bissap Artisanal (50cl)',
    description: 'Infusion de fleurs d hibiscus frais à la menthe poivrée et sucre de canne.',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    price: 1000,
    category: DishCategory.NORMAL,
    type: DishType.DRINK,
    categoryId: catNormal._id,
    sortOrder: 1
  });

  // 5. Creation d'une promotion
  await Promotion.create({
    title: 'Offre Decouverte Grillade',
    description: 'Remise exceptionnelle sur notre celebre Poulet Braise Maison.',
    type: PromotionType.PROMOTIONAL_PRICE,
    value: 4500,
    dishId: pouletBraise._id,
    isActive: true
  });

  // 6. Parametres du restaurant
  await RestaurantSettings.create({
    name: 'Chez Roger Becker',
    phone: '+225 07 01 02 03 04',
    address: 'Cocody Vallon, Rue des Jardins, Abidjan, Côte d\'Ivoire',
    description: 'L\'authenticité culinaire ivoirienne et les meilleures grillades d\'Abidjan.',
    openingHours: 'Mardi – Dimanche : 11h00 – 23h00 (Fermé le lundi)',
    deliveryFee: 1000,
    isOpen: true
  });

  console.log('[Seed] Initialisation effectuee avec succes !');
  console.log('Compte Administrateur: admin@rogerbecker.com / AdminBecker2026!');
  console.log('Comptes Livreurs: kouame@rogerbecker.com ou bakary@rogerbecker.com / Livreur2026!');
  await disconnectDatabase();
};

seed().catch((err) => {
  console.error('[Seed] Erreur:', err);
  process.exit(1);
});
