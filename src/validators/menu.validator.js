/**
 * Validateurs Zod pour les categories, les plats et les promotions.
 */

const { z } = require('zod');
const { PromotionType } = require('../constants/enums');

// Validation pour les Categories
const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Le nom de la categorie est obligatoire' })
    .min(2, 'Le nom doit comporter au moins 2 caracteres')
    .max(100)
    .trim(),
  description: z.string().max(500).optional().default(''),
  image: z.string().optional().default(''),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0)
});

const updateCategorySchema = createCategorySchema.partial();

// Validation pour les Plats
const dishOptionValidator = z.object({
  name: z.string().min(1, 'Le nom de l option est obligatoire').trim(),
  priceModifier: z.number().min(0).default(0)
});

const createDishSchema = z.object({
  name: z
    .string({ required_error: 'Le nom du plat est obligatoire' })
    .min(2, 'Le nom doit comporter au moins 2 caracteres')
    .max(120)
    .trim(),
  description: z
    .string({ required_error: 'La description du plat est obligatoire' })
    .min(5, 'La description doit comporter au moins 5 caracteres')
    .max(800)
    .trim(),
  image: z
    .string({ required_error: 'L image du plat est obligatoire' })
    .min(1, 'L URL de l image ne peut pas etre vide')
    .trim(),
  price: z
    .number({ required_error: 'Le prix est obligatoire' })
    .min(0, 'Le prix ne peut pas etre negatif'),
  promotionalPrice: z
    .number()
    .min(0)
    .nullable()
    .optional(),
  categoryId: z
    .string({ required_error: 'La categorie est obligatoire' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Identifiant de categorie MongoDB invalide'),
  isAvailable: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  options: z.array(dishOptionValidator).optional().default([]),
  sortOrder: z.number().int().optional().default(0)
});

const updateDishSchema = createDishSchema.partial();

// Validation pour les Promotions
const createPromotionSchema = z.object({
  title: z
    .string({ required_error: 'Le titre de la promotion est obligatoire' })
    .min(2)
    .max(100)
    .trim(),
  description: z
    .string({ required_error: 'La description de la promotion est obligatoire' })
    .min(5)
    .max(500)
    .trim(),
  image: z.string().optional().default(''),
  type: z.nativeEnum(PromotionType, {
    errorMap: () => ({ message: 'Type de promotion invalide' })
  }),
  value: z
    .number({ required_error: 'La valeur de la promotion est obligatoire' })
    .min(0, 'La valeur ne peut pas etre negative'),
  dishId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Identifiant de plat invalide')
    .nullable()
    .optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).nullable().optional(),
  isActive: z.boolean().optional().default(true)
});

const updatePromotionSchema = createPromotionSchema.partial();

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  createDishSchema,
  updateDishSchema,
  createPromotionSchema,
  updatePromotionSchema
};
