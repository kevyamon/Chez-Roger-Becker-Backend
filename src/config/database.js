/**
 * Module de gestion de la connexion MongoDB via Mongoose.
 * Inclut la gestion du pool de connexions, la reconnexion automatique et l'arret gracieux.
 */

const mongoose = require('mongoose');
const env = require('./environment');

const connectDatabase = async () => {
  try {
    const options = {
      autoIndex: true,
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    mongoose.connection.on('connected', () => {
      console.log('[MongoDB] Connexion etablie avec succes');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Erreur de connexion:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Connexion perdue, tentative de reconnexion...');
    });

    await mongoose.connect(env.MONGODB_URI, options);
  } catch (error) {
    console.error('[MongoDB] Echec critique lors de l initialisation de la base de donnees:', error.message);
    process.exit(1);
  }
};

const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close();
    console.log('[MongoDB] Connexion fermee proprement');
  } catch (error) {
    console.error('[MongoDB] Erreur lors de la fermeture de la connexion:', error.message);
  }
};

module.exports = {
  connectDatabase,
  disconnectDatabase
};
