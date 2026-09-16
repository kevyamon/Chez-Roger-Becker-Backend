/**
 * Modele Mongoose pour les parametres globaux du restaurant Chez Roger Becker.
 * Gere les coordonnees, les horaires, les frais de livraison et l'etat d'ouverture du restaurant.
 */

const mongoose = require('mongoose');

const restaurantSettingsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: 'Chez Roger Becker',
      trim: true
    },
    logo: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      required: true,
      default: '+225 07 00 00 00 00',
      trim: true
    },
    address: {
      type: String,
      required: true,
      default: 'Abidjan, Cote d Ivoire',
      trim: true
    },
    description: {
      type: String,
      default: 'Restaurant gastronomique et grillades traditionnelles.',
      trim: true
    },
    openingHours: {
      type: String,
      default: 'Mardi - Dimanche : 11h00 - 23h00 (Ferme le Lundi)',
      trim: true
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 1000,
      min: [0, 'Les frais de livraison ne peuvent pas etre negatifs']
    },
    isOpen: {
      type: Boolean,
      default: true,
      index: true
    },
    closedMessage: {
      type: String,
      default: 'Le restaurant est actuellement ferme. Les commandes reprendront des la prochaine ouverture.',
      trim: true
    },
    socialLinks: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      whatsapp: { type: String, default: '' }
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

// Methode statique pour recuperer les reglages (pattern document unique)
restaurantSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const RestaurantSettings = mongoose.model('RestaurantSettings', restaurantSettingsSchema);

module.exports = RestaurantSettings;
