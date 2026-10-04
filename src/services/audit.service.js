/**
 * Service dédié au journal d'audit et à la traçabilité (AuditService).
 * Fournit la consultation, la suppression ciblée et la purge du journal.
 */

const AuditLog = require('../models/auditLog.model');

class AuditService {
  async getAuditLogs({ page = 1, limit = 30, action, actorId } = {}) {
    const query = {};
    if (action) query.action = action;
    if (actorId) query.actorId = actorId;

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actorId', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return { logs, total, page, limit };
  }

  async deleteAuditLog(logId, actorId) {
    const log = await AuditLog.findByIdAndDelete(logId);
    if (!log) {
      const error = new Error('Entrée du journal introuvable.');
      error.statusCode = 404;
      throw error;
    }
    return { message: 'Entrée supprimée avec succès' };
  }

  async clearAuditLogs(actorId) {
    const result = await AuditLog.deleteMany({});
    // Enregistrement d'un log initial après la purge pour tracer l'action
    await AuditLog.create({
      action: 'AUDIT_LOGS_CLEARED',
      actorId,
      actorRole: 'ADMIN',
      targetModel: 'AuditLog',
      targetId: 'ALL',
      details: { deletedCount: result.deletedCount }
    });

    return { message: 'Journal d\'audit purgé avec succès', deletedCount: result.deletedCount };
  }
}

module.exports = new AuditService();
