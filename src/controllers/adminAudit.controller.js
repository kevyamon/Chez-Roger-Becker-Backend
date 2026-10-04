/**
 * Contrôleur d'administration pour la traçabilité et les logs d'audit (AdminAuditController).
 * Permet la consultation, suppression d'actions spécifiques et la purge du journal.
 */

const auditService = require('../services/audit.service');
const { sendSuccess, sendPaginated } = require('../utils/responseHelper');

class AdminAuditController {
  async getAuditLogs(req, res, next) {
    try {
      const { page = 1, limit = 30, action, actorId } = req.query;
      const { logs, total } = await auditService.getAuditLogs({ page, limit, action, actorId });
      return sendPaginated(res, logs, { total, page, limit }, 'Journal d\'audit récupéré avec succès');
    } catch (error) {
      next(error);
    }
  }

  async deleteAuditLog(req, res, next) {
    try {
      const result = await auditService.deleteAuditLog(req.params.id, req.user.id);
      return sendSuccess(res, result, 'Log d\'audit supprimé avec succès');
    } catch (error) {
      next(error);
    }
  }

  async clearAuditLogs(req, res, next) {
    try {
      const result = await auditService.clearAuditLogs(req.user.id);
      return sendSuccess(res, result, 'Journal d\'audit purgé avec succès');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminAuditController();
