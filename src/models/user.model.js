/**
 * Modele Mongoose pour les utilisateurs du systeme (Administrateur et Livreurs).
 * Hash Bcrypt a 12 rounds et exclusion automatique du hash de mot de passe lors de la serialisation.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { UserRole, DriverStatus } = require('../constants/enums');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'Le prenom est obligatoire'],
      trim: true,
      maxlength: [60, 'Le prenom ne peut pas depasser 60 caracteres']
    },
    lastName: {
      type: String,
      required: [true, 'Le nom est obligatoire'],
      trim: true,
      maxlength: [60, 'Le nom ne peut pas depasser 60 caracteres']
    },
    phone: {
      type: String,
      required: [true, 'Le numero de telephone est obligatoire'],
      unique: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      required: [true, 'L adresse e-mail est obligatoire'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Le mot de passe est obligatoire'],
      select: false // Exclu par defaut des requetes
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      default: UserRole.DRIVER,
      index: true
    },
    driverStatus: {
      type: String,
      enum: Object.values(DriverStatus),
      default: DriverStatus.OFFLINE,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    refreshTokenHash: {
      type: String,
      select: false
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.refreshTokenHash;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.refreshTokenHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Hachage du mot de passe avant enregistrement (minimum 12 rounds)
userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Methode d instance pour comparer les mots de passe
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
