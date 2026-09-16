/**
 * Modele Mongoose pour les categories de plats (Plats, Grillades, Boissons, Accompagnements, etc.).
 */

const mongoose = require('mongoose');
const { generateSlug } = require('../utils/tokenGenerator');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Le nom de la categorie est obligatoire'],
      unique: true,
      trim: true,
      maxlength: [100, 'Le nom de la categorie ne peut pas depasser 100 caracteres']
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
      trim: true,
      default: '',
      maxlength: [500, 'La description ne peut pas depasser 500 caracteres']
    },
    image: {
      type: String,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
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
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Generation automatique du slug avant validation
categorySchema.pre('validate', function (next) {
  if (this.isModified('name') && (!this.slug || this.isModified('slug'))) {
    this.slug = generateSlug(this.slug || this.name);
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
