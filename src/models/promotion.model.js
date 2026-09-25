/**
 * Modele Mongoose pour les promotions et offres speciales Chez Roger Becker.
 */

const mongoose = require('mongoose');
const { PromotionType } = require('../constants/enums');

const promotionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Le titre de l offre est obligatoire'],
      trim: true,
      maxlength: [100, 'Le titre ne peut pas depasser 100 caracteres']
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
    },
    image: {
      type: String,
      default: '',
      trim: true
    },
    link: {
      type: String,
      default: '',
      trim: true,
      maxlength: [300, 'Le lien ne peut pas dépasser 300 caractères']
    },
    type: {
      type: String,
      enum: Object.values(PromotionType),
      default: PromotionType.ANNOUNCEMENT,
      required: true
    },
    value: {
      type: Number,
      default: 0,
      min: [0, 'La valeur ne peut pas être négative']
    },
    dishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dish',
      default: null,
      index: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Index pour filtrer facilement les promotions actuellement actives
promotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

const Promotion = mongoose.model('Promotion', promotionSchema);

module.exports = Promotion;
