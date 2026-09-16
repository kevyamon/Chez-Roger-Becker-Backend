/**
 * Utilitaires de standardisation des reponses API pour Chez Roger Becker.
 * Garantit un format de reponse strictement conforme au cahier des charges.
 */

const sendSuccess = (res, data = {}, message = 'Operation reussie', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  });
};

const sendPaginated = (res, items = [], pagination = {}, message = 'Liste recuperee avec succes') => {
  const { total = 0, page = 1, limit = 20 } = pagination;
  const totalPages = Math.ceil(total / limit) || 1;

  return res.status(200).json({
    success: true,
    data: {
      items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        hasNextPage: Number(page) < totalPages,
        hasPrevPage: Number(page) > 1
      }
    },
    message
  });
};

const sendError = (res, errorPayload, statusCode = 400) => {
  const {
    code = 'ERROR',
    message = 'Une erreur est survenue',
    details = {}
  } = typeof errorPayload === 'string' ? { message: errorPayload } : errorPayload;

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details
    }
  });
};

module.exports = {
  sendSuccess,
  sendPaginated,
  sendError
};
