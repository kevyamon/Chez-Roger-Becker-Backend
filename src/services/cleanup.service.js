/**
 * Service de nettoyage et d'archivage automatique (CleanupService).
 * Archive les statistiques financières avant la purge définitive des commandes de plus de 30 jours.
 */

const Order = require('../models/order.model');
const DailyStat = require('../models/dailyStat.model');
const { OrderStatus } = require('../constants/enums');

class CleanupService {
  /**
   * Consolide les statistiques financières d'une journée donnée dans DailyStat.
   */
  async consolidateDay(dateString) {
    const start = new Date(`${dateString}T00:00:00.000Z`);
    const end = new Date(`${dateString}T23:59:59.999Z`);

    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end }
    }).lean();

    if (!orders.length) return;

    let ordersCount = orders.length;
    let deliveredCount = 0;
    let cancelledCount = 0;
    let totalRevenue = 0;
    let deliveryFeesCollected = 0;

    for (const ord of orders) {
      if (ord.status === OrderStatus.DELIVERED) {
        deliveredCount += 1;
        totalRevenue += ord.total || 0;
        deliveryFeesCollected += ord.deliveryFee || 0;
      } else if (ord.status === OrderStatus.CANCELLED) {
        cancelledCount += 1;
      }
    }

    await DailyStat.findOneAndUpdate(
      { date: dateString },
      {
        $set: {
          ordersCount,
          deliveredCount,
          cancelledCount,
          totalRevenue,
          deliveryFeesCollected
        }
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Archive les statistiques et purge définitivement les commandes datant de plus de 30 jours.
   */
  async purgeOrdersOlderThan30Days() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const oldOrders = await Order.find({
        createdAt: { $lt: thirtyDaysAgo }
      }).lean();

      if (!oldOrders.length) return { purgedCount: 0 };

      // 1. Regroupement par jour pour consolidation statistique
      const daysMap = new Set();
      oldOrders.forEach((o) => {
        const d = new Date(o.createdAt).toISOString().split('T')[0];
        daysMap.add(d);
      });

      for (const dateStr of daysMap) {
        await this.consolidateDay(dateStr);
      }

      // 2. Suppression définitive des commandes en base de données
      const deleteResult = await Order.deleteMany({
        createdAt: { $lt: thirtyDaysAgo }
      });

      console.log(`[CleanupService] Purge terminée : ${deleteResult.deletedCount} commandes de plus de 30 jours supprimées.`);
      return { purgedCount: deleteResult.deletedCount };
    } catch (error) {
      console.error('[CleanupService] Erreur lors de la purge des commandes :', error.message);
      return { purgedCount: 0, error: error.message };
    }
  }

  /**
   * Démarre la tâche planifiée quotidienne de nettoyage (toutes les 24h).
   */
  initScheduledCleanup() {
    // Exécution initiale au démarrage
    this.purgeOrdersOlderThan30Days();

    // Répétition toutes les 24 heures (86 400 000 ms)
    setInterval(() => {
      this.purgeOrdersOlderThan30Days();
    }, 24 * 60 * 60 * 1000);
  }
}

module.exports = new CleanupService();
