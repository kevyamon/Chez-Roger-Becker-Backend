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
const { UserRole, DriverStatus, PromotionType } = require('../constants/enums');

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

  // 3. Creation des Categories
  const catGrillades = await Category.create({
    name: 'Grillades & Braises',
    description: 'Specialites au feu de bois et marinades maison',
    sortOrder: 1
  });

  const catPlats = await Category.create({
    name: 'Plats Cuisines',
    description: 'Sauces traditionnelles et recettes mijotees',
    sortOrder: 2
  });

  const catAccompagnements = await Category.create({
    name: 'Accompagnements',
    description: 'Attieke, alloco, frites et riz parfume',
    sortOrder: 3
  });

  const catBoissons = await Category.create({
    name: 'Boissons & Rafraichissements',
    description: 'Jus locaux naturels et boissons fraiches',
    sortOrder: 4
  });

  // 4. Creation des Plats
  const pouletBraise = await Dish.create({
    name: 'Poulet Braise Maison (Entier)',
    description: 'Poulet fermier marine aux epices secretes de Roger, braise au charbon de bois.',
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80',
    price: 5000,
    promotionalPrice: 4500,
    categoryId: catGrillades._id,
    isFeatured: true,
    sortOrder: 1,
    options: [{ name: 'Piment doux' }, { name: 'Piment fort' }]
  });

  await Dish.create({
    name: 'Poisson Carpe Braisee Royale',
    description: 'Belle carpe fraiche braisee, servie avec sa sauce oignon-tomate et piments frais.',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
    price: 6000,
    categoryId: catGrillades._id,
    isFeatured: true,
    sortOrder: 2
  });

  await Dish.create({
    name: 'Garba Royal au Thon Frit',
    description: 'Attieke fin accompagne de darne de thon marinee et frite a point, tomates et piments.',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    price: 3500,
    categoryId: catPlats._id,
    isFeatured: true,
    sortOrder: 1
  });

  await Dish.create({
    name: 'Portion d Alloco Dore',
    description: 'Bananes plantains mures frites a l huile d arachide pure.',
    image: 'https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&w=800&q=80',
    price: 1000,
    categoryId: catAccompagnements._id,
    sortOrder: 1
  });

  await Dish.create({
    name: 'Attieke Frais Garba',
    description: 'Semoule de manioc cuite a la vapeur, legere et aeree.',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
    price: 500,
    categoryId: catAccompagnements._id,
    sortOrder: 2
  });

  await Dish.create({
    name: 'Jus de Bissap Artisanal (50cl)',
    description: 'Infusion de fleurs d hibiscus frais a la menthe poivree et sucre de canne.',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    price: 1000,
    categoryId: catBoissons._id,
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
    address: 'Cocody Vallon, Rue des Jardins, Abidjan',
    description: 'L authenticite culinaire ivoirienne et les meilleures grillades d Abidjan.',
    openingHours: 'Tous les jours de 11h00 a 23h30',
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
