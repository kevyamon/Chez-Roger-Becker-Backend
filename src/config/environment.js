/**
 * Module centralise de validation et chargement des variables d'environnement.
 * Garantit que l'application ne demarre jamais avec une configuration incomplete ou non securisee.
 */

const dotenv = require('dotenv');
const path = require('path');

// Chargement du fichier .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const environment = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  
  // Base de donnees (accepte MONGODB_URI ou MONGO_URI)
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/chez_roger_becker',
  
  // Securite & Authentification (accepte REFRESH_TOKEN_SECRET ou JWT_REFRESH_SECRET)
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_key_chez_roger_becker_change_in_production_min32chars',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET || 'dev_refresh_jwt_secret_chez_roger_becker_change_in_prod_min32',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'cookie_secret_sign_chez_roger_becker_min32chars',
  
  // CORS & Origines autorisees
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  CORS_ORIGIN: (() => {
    const raw = process.env.ALLOW_ORIGINS || process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS;
    if (raw) {
      return raw.split(',').map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean);
    }
    return ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
  })(),
  
  // Parametres metier par defaut
  DEFAULT_DELIVERY_FEE: parseInt(process.env.DEFAULT_DELIVERY_FEE, 10) || 1000,
  RESTAURANT_NAME: process.env.RESTAURANT_NAME || 'Chez Roger Becker',
  RESTAURANT_PHONE: process.env.RESTAURANT_PHONE || '+225 07 00 00 00 00',
  
  // Securite Cookies
  isProduction: process.env.NODE_ENV === 'production',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 jours
  }
};

// Verification en production
if (environment.isProduction) {
  const hasMongo = Boolean(process.env.MONGODB_URI || process.env.MONGO_URI);
  const hasJwt = Boolean(process.env.JWT_SECRET);
  const hasRefresh = Boolean(process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET);
  const hasCookie = Boolean(process.env.COOKIE_SECRET);

  const missing = [];
  if (!hasMongo) missing.push('MONGODB_URI ou MONGO_URI');
  if (!hasJwt) missing.push('JWT_SECRET');
  if (!hasRefresh) missing.push('REFRESH_TOKEN_SECRET ou JWT_REFRESH_SECRET');
  if (!hasCookie) missing.push('COOKIE_SECRET');

  if (missing.length > 0) {
    throw new Error(`Configuration critique manquante en production: ${missing.join(', ')}`);
  }
}

module.exports = environment;
