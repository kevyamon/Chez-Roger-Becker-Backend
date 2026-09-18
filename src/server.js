/**
 * Point d'entree principal du serveur HTTP et du serveur de WebSocket Socket.IO.
 */

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const env = require('./config/environment');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { initSocket } = require('./sockets/socketHandler');
const cleanupService = require('./services/cleanup.service');

const startServer = async () => {
  // 1. Connexion a MongoDB
  await connectDatabase();

  // 1.1 Initialisation de la purge et consolidation des statistiques (30 jours)
  cleanupService.initScheduledCleanup();

  // 2. Creation du serveur HTTP
  const server = http.createServer(app);

  // 3. Initialisation de Socket.IO avec support CORS
  const io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // 4. Initialisation du gestionnaire de sockets et injection dans Express
  const socketEmitter = initSocket(io);
  app.set('socketEmitter', socketEmitter);

  // 5. Demarrage de l'ecoute reseau
  server.listen(env.PORT, () => {
    console.log(`=========================================`);
    console.log(`[Chez Roger Becker API] Serveur demarre`);
    console.log(`Port d ecoute : ${env.PORT}`);
    console.log(`Environnement : ${env.NODE_ENV}`);
    console.log(`URL de base   : http://localhost:${env.PORT}/api/v1`);
    console.log(`=========================================`);
  });

  // 6. Gestion propre de l'arret du serveur (Graceful Shutdown)
  const handleShutdown = async (signal) => {
    console.log(`[Serveur] Signal ${signal} recu. Fermeture en cours...`);
    server.close(async () => {
      await disconnectDatabase();
      console.log('[Serveur] Serveur et base de donnees fermes proprement.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer().catch((error) => {
  console.error('[Serveur] Erreur fatale au demarrage :', error);
  process.exit(1);
});
