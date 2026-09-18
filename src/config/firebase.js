/**
 * Configuration et initialisation centralisée de Firebase Admin SDK.
 * Permet l'envoi sécurisé de notifications push vers Firebase Cloud Messaging (FCM).
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseApp = null;

try {
  // 1. Vérification si un fichier serviceAccountKey.json existe localement
  const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('[Firebase Admin] Initialisé avec succès via serviceAccountKey.json');
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    // 2. Initialisation via les variables d'environnement (idéal pour Render / Production)
    const formattedPrivateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'chez-roger-becker',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedPrivateKey
      })
    });
    console.log('[Firebase Admin] Initialisé avec succès via variables d\'environnement');
  } else {
    console.warn('[Firebase Admin] Aucune clé de service configurée. Les notifications push seront désactivées en local.');
  }
} catch (error) {
  console.error('[Firebase Admin] Erreur lors de l\'initialisation :', error.message);
}

const messaging = firebaseApp ? admin.messaging() : null;

module.exports = {
  admin,
  firebaseApp,
  messaging
};
