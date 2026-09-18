/**
 * Modèle Mongoose pour les statistiques journalières consolidées (DailyStat).
 * Préserve l'historique financier et le volume d'activité même après la purge des commandes de plus de 30 jours.
 */

const mongoose = require('mongoose');

const dailyStatSchema = new mongoose.Schema(
  {
    date: {
      type: String, // Format 'YYYY-MM-DD'
      required: true,
      unique: true,
      index: true
    },
    ordersCount: {
      type: Number,
      default: 0,
      min: 0
    },
    deliveredCount: {
      type: Number,
      default: 0,
      min: 0
    },
    cancelledCount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0
    },
    deliveryFeesCollected: {
      type: Number,
      default: 0,
      min: 0
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

const DailyStat = mongoose.model('DailyStat', dailyStatSchema);

module.exports = DailyStat;
