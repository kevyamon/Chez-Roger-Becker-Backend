/**
 * Gestionnaire Socket.IO pour la communication temps réel.
 * Salons : 'admin', 'drivers', 'order_{trackingToken}' et diffusion globale.
 */

const initSocket = (io) => {
  io.on('connection', (socket) => {
    // 1. Rejoindre le salon d'administration
    socket.on('join:admin', () => {
      socket.join('admin');
    });

    // 2. Rejoindre le salon des livreurs
    socket.on('join:drivers', () => {
      socket.join('drivers');
    });

    // 3. Rejoindre le salon de suivi d'une commande spécifique
    socket.on('join:order', (trackingToken) => {
      if (trackingToken) {
        socket.join(`order_${trackingToken}`);
      }
    });

    socket.on('disconnect', () => {
      // Déconnexion propre sans log excessif
    });
  });

  // Interface d'émission d'événements
  const socketEmitter = {
    emitToAdmin: (event, data) => {
      io.to('admin').emit(event, data);
    },
    emitToDrivers: (event, data) => {
      io.to('drivers').emit(event, data);
    },
    emitToOrder: (trackingToken, event, data) => {
      io.to(`order_${trackingToken}`).emit(event, data);
    },
    emitGlobal: (event, data) => {
      io.emit(event, data);
    }
  };

  return socketEmitter;
};

module.exports = { initSocket };

