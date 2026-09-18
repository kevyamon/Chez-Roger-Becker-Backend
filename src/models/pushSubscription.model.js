/**
 * Modèle Mongoose pour les abonnements aux notifications push (PushSubscription).
 * Stocke les jetons FCM des appareils et les associe aux rôles ou aux suivis de commande.
 */

const mongoose = require('mongoose');
const { UserRole } = require('../constants/enums');

const pushSubscriptionSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: [true, 'Le jeton FCM est obligatoire'],
      unique: true,
      trim: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    role: {
      type: String,
      enum: [...Object.values(UserRole), 'CUSTOMER'],
      default: 'CUSTOMER',
      index: true
    },
    trackingTokens: {
      type: [String],
      default: [],
      index: true
    },
    userAgent: {
      type: String,
      trim: true,
      default: ''
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
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

// Index composés pour des recherches rapides lors de l'émission
pushSubscriptionSchema.index({ role: 1, lastActiveAt: -1 });
pushSubscriptionSchema.index({ trackingTokens: 1, lastActiveAt: -1 });

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);

module.exports = PushSubscription;
