/**
 * Schémas de validation Zod pour les abonnements et notifications push.
 */

const { z } = require('zod');
const { UserRole } = require('../constants/enums');

const subscribeSchema = z.object({
  token: z
    .string({ required_error: 'Le jeton FCM est obligatoire' })
    .min(10, 'Jeton FCM invalide ou trop court'),
  role: z
    .enum([...Object.values(UserRole), 'CUSTOMER'])
    .optional(),
  trackingToken: z
    .string()
    .trim()
    .optional(),
  userAgent: z
    .string()
    .trim()
    .max(500)
    .optional()
});

const linkOrderSchema = z.object({
  token: z
    .string({ required_error: 'Le jeton FCM est obligatoire' })
    .min(10, 'Jeton FCM invalide ou trop court'),
  trackingToken: z
    .string({ required_error: 'Le jeton de suivi de commande est obligatoire' })
    .min(5, 'Jeton de suivi invalide')
});

const unsubscribeSchema = z.object({
  token: z
    .string({ required_error: 'Le jeton FCM est obligatoire' })
    .min(10, 'Jeton FCM invalide')
});

module.exports = {
  subscribeSchema,
  linkOrderSchema,
  unsubscribeSchema
};
