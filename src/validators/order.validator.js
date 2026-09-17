/**
 * Validateurs Zod pour la creation et la gestion des commandes et des parametres restaurant.
 * Applique le Mode Forteresse : les prix envoyes par le client ne sont jamais acceptes ni lus.
 */

const { z } = require('zod');
const { OrderStatus, PaymentMethod } = require('../constants/enums');

const orderItemInputSchema = z.object({
  dishId: z
    .string({ required_error: 'L\'identifiant du plat est obligatoire' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Identifiant de plat invalide'),
  quantity: z
    .number({ required_error: 'La quantité est obligatoire' })
    .int('La quantité doit être un nombre entier')
    .min(1, 'La quantité minimale est de 1')
    .max(50, 'Quantité excessive pour un plat individuel'),
  selectedOptions: z.array(z.string().trim()).optional().default([])
});

const coordinatesSchema = z.tuple([
  z.number().min(-180, 'Longitude invalide').max(180, 'Longitude invalide'), // Longitude
  z.number().min(-90, 'Latitude invalide').max(90, 'Latitude invalide')      // Latitude
]);

const createOrderSchema = z.object({
  customer: z.object({
    name: z
      .string({ required_error: 'Le nom du client est obligatoire' })
      .min(2, 'Le nom doit comporter au moins 2 caractères')
      .max(100)
      .trim(),
    phone: z
      .string({ required_error: 'Le numéro de téléphone est obligatoire' })
      .min(8, 'Numéro de téléphone invalide')
      .max(20)
      .trim()
  }),
  items: z
    .array(orderItemInputSchema, { required_error: 'Le panier ne peut pas être vide' })
    .min(1, 'Le panier doit contenir au moins un article'),
  delivery: z.object({
    address: z
      .string({ required_error: 'L\'adresse de livraison est obligatoire' })
      .min(3, 'L\'adresse de livraison doit comporter au moins 3 caractères')
      .max(300)
      .trim(),
    note: z.string().max(500).optional().default(''),
    location: z.object({
      type: z.literal('Point').default('Point'),
      coordinates: coordinatesSchema
    })
  }),
  paymentMethod: z
    .nativeEnum(PaymentMethod, { errorMap: () => ({ message: 'Méthode de paiement non supportée' }) })
    .optional()
    .default(PaymentMethod.CASH_ON_DELIVERY)
});

const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus, {
    errorMap: () => ({ message: 'Statut de commande invalide' })
  }),
  note: z.string().max(500).optional().default('')
});

const updateSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logo: z.string().optional(),
  phone: z.string().min(8).max(30).optional(),
  address: z.string().min(5).max(300).optional(),
  description: z.string().max(1000).optional(),
  openingHours: z.string().max(200).optional(),
  deliveryFee: z.number().min(0).optional(),
  isOpen: z.boolean().optional(),
  closedMessage: z.string().max(500).optional(),
  socialLinks: z
    .object({
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      whatsapp: z.string().optional()
    })
    .optional()
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  updateSettingsSchema
};
