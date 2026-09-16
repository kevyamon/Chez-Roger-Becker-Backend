/**
 * Modele Mongoose pour les commandes (Order) de Chez Roger Becker.
 * Inclut l'indexation geospatiale 2dsphere GeoJSON, l'historique complet des statuts et les montants verifies.
 */

const mongoose = require('mongoose');
const { OrderStatus, PaymentMethod, PaymentStatus } = require('../constants/enums');

const orderItemSchema = new mongoose.Schema(
  {
    dishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dish',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'La quantite doit etre d au moins 1']
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Le prix unitaire ne peut pas etre negatif']
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Le sous-total ne peut pas etre negatif']
    },
    selectedOptions: {
      type: [String],
      default: []
    }
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true
    },
    changedBy: {
      type: String,
      required: true,
      trim: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    trackingToken: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    customer: {
      name: {
        type: String,
        required: [true, 'Le nom du client est obligatoire'],
        trim: true,
        maxlength: [100, 'Le nom ne peut pas depasser 100 caracteres']
      },
      phone: {
        type: String,
        required: [true, 'Le telephone du client est obligatoire'],
        trim: true
      }
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items && items.length > 0,
        message: 'La commande doit contenir au moins un plat'
      }
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    delivery: {
      address: {
        type: String,
        required: [true, 'L adresse de livraison est obligatoire'],
        trim: true
      },
      note: {
        type: String,
        trim: true,
        default: ''
      },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          required: [true, 'Les coordonnees GPS sont obligatoires'],
          validate: {
            validator: (coords) => Array.isArray(coords) && coords.length === 2,
            message: 'Les coordonnees doivent contenir exactement [longitude, latitude]'
          }
        }
      }
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: []
    },
    payment: {
      method: {
        type: String,
        enum: Object.values(PaymentMethod),
        default: PaymentMethod.CASH_ON_DELIVERY
      },
      status: {
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.PENDING
      }
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

// Index geospatiale pour requetes spatiales rapides
orderSchema.index({ 'delivery.location': '2dsphere' });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ driverId: 1, status: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
