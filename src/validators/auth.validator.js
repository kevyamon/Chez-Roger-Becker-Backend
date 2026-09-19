/**
 * Validateurs Zod pour l'authentification et les comptes livreurs / administrateurs.
 * Contrôle strict des formats, de la longueur et normalisation des chaînes de caractères.
 */

const { z } = require('zod');
const { DriverStatus } = require('../constants/enums');

const loginSchema = z.object({
  identifier: z
    .string({ required_error: 'L\'identifiant (e-mail ou téléphone) est obligatoire' })
    .min(3, 'L\'identifiant doit comporter au moins 3 caractères')
    .trim(),
  password: z
    .string({ required_error: 'Le mot de passe est obligatoire' })
    .min(6, 'Le mot de passe doit comporter au moins 6 caractères')
});

const registerAdminSchema = z.object({
  name: z
    .string({ required_error: 'Le nom complet est obligatoire' })
    .min(2, 'Le nom doit comporter au moins 2 caractères')
    .max(100)
    .trim(),
  email: z
    .string({ required_error: 'L\'adresse e-mail est obligatoire' })
    .email('Format d\'adresse e-mail invalide')
    .toLowerCase()
    .trim(),
  phone: z
    .string({ required_error: 'Le numéro de téléphone est obligatoire' })
    .min(8, 'Le numéro de téléphone doit comporter au moins 8 caractères')
    .trim(),
  password: z
    .string({ required_error: 'Le mot de passe est obligatoire' })
    .min(8, 'Le mot de passe doit comporter au moins 8 caractères'),
  privateKey: z
    .string({ required_error: 'La clé privée est obligatoire' })
    .min(1, 'La clé privée est obligatoire')
    .trim()
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().optional()
});

const createDriverSchema = z.object({
  firstName: z
    .string({ required_error: 'Le prénom est obligatoire' })
    .min(2, 'Le prénom doit comporter au moins 2 caractères')
    .max(60)
    .trim(),
  lastName: z
    .string({ required_error: 'Le nom est obligatoire' })
    .min(2, 'Le nom doit comporter au moins 2 caractères')
    .max(60)
    .trim(),
  phone: z
    .string({ required_error: 'Le numéro de téléphone est obligatoire' })
    .min(8, 'Numéro de téléphone invalide')
    .trim(),
  email: z
    .string({ required_error: 'L\'adresse e-mail est obligatoire' })
    .email('Format d\'adresse e-mail invalide')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Le mot de passe ou code d\'accès est obligatoire' })
    .min(4, 'Le mot de passe ou code doit comporter au moins 4 caractères')
});

const updateDriverProfileSchema = z.object({
  firstName: z.string().min(2, 'Le prénom doit comporter au moins 2 caractères').max(60).trim().optional(),
  lastName: z.string().min(2, 'Le nom doit comporter au moins 2 caractères').max(60).trim().optional(),
  phone: z.string().min(8, 'Numéro de téléphone invalide').trim().optional(),
  email: z.string().email('Format d\'adresse e-mail invalide').toLowerCase().trim().optional()
});

const changePasswordSchema = z.object({
  oldPassword: z
    .string({ required_error: 'Le mot de passe actuel est obligatoire' })
    .min(1, 'Veuillez saisir votre mot de passe actuel'),
  newPassword: z
    .string({ required_error: 'Le nouveau mot de passe est obligatoire' })
    .min(6, 'Le nouveau mot de passe doit comporter au moins 6 caractères')
});

const updateDriverSchema = z.object({
  firstName: z.string().min(2).max(60).trim().optional(),
  lastName: z.string().min(2).max(60).trim().optional(),
  phone: z.string().min(8).trim().optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  password: z.string().min(4).optional(),
  isActive: z.boolean().optional()
});

const updateDriverStatusSchema = z.object({
  status: z.nativeEnum(DriverStatus, {
    errorMap: () => ({ message: 'Statut de livreur invalide (AVAILABLE, BUSY, OFFLINE attendus)' })
  })
});

module.exports = {
  loginSchema,
  registerAdminSchema,
  refreshTokenSchema,
  createDriverSchema,
  updateDriverProfileSchema,
  changePasswordSchema,
  updateDriverSchema,
  updateDriverStatusSchema
};
