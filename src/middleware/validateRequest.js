/**
 * Middleware generique de validation des requetes HTTP via des schemas Zod.
 * Rejette toute donnee inattendue ou malformee avant d'atteindre les controleurs.
 */

const { ErrorCodes } = require('../constants/enums');
const { sendError } = require('../utils/responseHelper');

/**
 * Valide les differentes parties de la requete (body, query, params) avec un schema Zod.
 * @param {import('zod').ZodSchema} schema - Schema Zod de validation.
 * @param {'body'|'query'|'params'} [source='body'] - Partie de la requete a valider.
 */
const validateRequest = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const validatedData = await schema.parseAsync(req[source]);
      req[source] = validatedData;
      return next();
    } catch (error) {
      const formattedDetails = {};

      if (error.issues && Array.isArray(error.issues)) {
        error.issues.forEach((issue) => {
          const path = issue.path.join('.') || 'root';
          formattedDetails[path] = issue.message;
        });
      }

      return sendError(
        res,
        {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Les donnees transmises sont invalides ou incompletes',
          details: formattedDetails
        },
        422
      );
    }
  };
};

module.exports = {
  validateRequest
};
