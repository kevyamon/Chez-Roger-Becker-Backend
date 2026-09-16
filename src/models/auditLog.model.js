/**
 * Modele Mongoose pour la tracabilite des actions sensibles (Audit Log).
 * Enregistre les modifications de prix, desactivations, transitions d'etats et actions d'administration.
 */

const mongoose = require('mongoose');
const { UserRole } = require('../constants/enums');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    actorRole: {
      type: String,
      enum: [...Object.values(UserRole), 'CUSTOMER', 'SYSTEM'],
      required: true
    },
    targetModel: {
      type: String,
      required: true,
      trim: true
    },
    targetId: {
      type: String,
      required: true,
      index: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
