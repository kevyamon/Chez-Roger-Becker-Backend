/**
 * Validateurs Zod pour l'authentification et les comptes livreurs.
 */

const { z } = require('zod');
const { DriverStatus } = require('../constants/enums');

const loginSchema = z.object({
  identifier: z
    .string({ required_error: 'L identifiant (e-mail ou telephone) est obligatoire' })
    .min(3, 'L identifiant doit comporter au moins 3 caracteres')
    .trim(),
  password: z
    .string({ required_error: 'Le mot de passe est obligatoire' })
    .min(6, 'Le mot de passe doit comporter au moins 6 caracteres')
});

const createDriverSchema = z.object({
  firstName: z
    .string({ required_error: 'Le prenom est obligatoire' })
    .min(2, 'Le prenom doit comporter au moins 2 caracteres')
    .max(60)
    .trim(),
  lastName: z
    .string({ required_error: 'Le nom est obligatoire' })
    .min(2, 'Le nom doit comporter au moins 2 caracteres')
    .max(60)
    .trim(),
  phone: z
    .string({ required_error: 'Le numero de telephone est obligatoire' })
    .min(8, 'Numero de telephone invalide')
    .trim(),
  email: z
    .string({ required_error: 'L adresse e-mail est obligatoire' })
    .email('Format d adresse e-mail invalide')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Le mot de passe est obligatoire' })
    .min(6, 'Le mot de passe doit comporter au moins 6 caracteres')
});

const updateDriverSchema = createDriverSchema.partial().extend({
  isActive: z.boolean().optional()
});

const updateDriverStatusSchema = z.object({
  status: z.nativeEnum(DriverStatus, {
    errorMap: () => ({ message: 'Statut de livreur invalide (AVAILABLE, BUSY, OFFLINE attendus)' })
  })
});

module.exports = {
  loginSchema,
  createDriverSchema,
  updateDriverSchema,
  updateDriverStatusSchema
};
