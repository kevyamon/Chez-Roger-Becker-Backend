/**
 * Modele Mongoose pour les plats du restaurant Chez Roger Becker.
 * Comprend le prix de base, prix promotionnel, disponibilite et indexation de recherche.
 */

const mongoose = require('mongoose');
const { generateSlug } = require('../utils/tokenGenerator');

const dishOptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    priceModifier: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

const dishSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Le nom du plat est obligatoire'],
      unique: true,
      trim: true,
      maxlength: [120, 'Le nom du plat ne peut pas depasser 120 caracteres']
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    description: {
      type: String,
      required: [true, 'La description du plat est obligatoire'],
      trim: true,
      maxlength: [800, 'La description ne peut pas depasser 800 caracteres']
    },
    image: {
      type: String,
      required: [true, 'Une image pour le plat est obligatoire'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Le prix est obligatoire'],
      min: [0, 'Le prix ne peut pas etre negatif']
    },
    promotionalPrice: {
      type: Number,
      default: null,
      validate: {
        validator: function (val) {
          if (val === null || val === undefined) return true;
          return val < this.price;
        },
        message: 'Le prix promotionnel doit etre inferieur au prix standard'
      }
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'La categorie est obligatoire'],
      index: true
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    },
    options: {
      type: [dishOptionSchema],
      default: []
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Slug automatique avant validation
dishSchema.pre('validate', function () {
  if (this.isModified('name') && (!this.slug || this.isModified('slug'))) {
    this.slug = generateSlug(this.slug || this.name);
  }
});

// Index textuel pour recherche ultra rapide sur le nom et la description
dishSchema.index({ name: 'text', description: 'text' });
dishSchema.index({ categoryId: 1, isAvailable: 1, sortOrder: 1 });

const Dish = mongoose.model('Dish', dishSchema);

module.exports = Dish;
