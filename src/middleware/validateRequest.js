/**
 * Middleware générique de validation des requêtes HTTP via des schémas Zod.
 * Rejette toute donnée inattendue ou malformée avant d'atteindre les contrôleurs.
 */

const { ErrorCodes } = require('../constants/enums');
const { sendError } = require('../utils/responseHelper');

/**
 * Valide les différentes parties de la requête (body, query, params) avec un schéma Zod.
 * @param {import('zod').ZodSchema} schema - Schéma Zod de validation.
 * @param {'body'|'query'|'params'} [source='body'] - Partie de la requête à valider.
 */
const validateRequest = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      if (!schema || typeof schema.parseAsync !== 'function') {
        return next();
      }
      const validatedData = await schema.parseAsync(req[source]);
      req[source] = validatedData;
      return next();
    } catch (error) {
      const formattedDetails = {};
      let firstErrorMessage = 'Les données transmises sont invalides ou incomplètes.';

      if (error.issues && Array.isArray(error.issues) && error.issues.length > 0) {
        firstErrorMessage = error.issues[0].message;
        error.issues.forEach((issue) => {
          const path = issue.path.join('.') || 'racine';
          formattedDetails[path] = issue.message;
        });
      }

      return sendError(
        res,
        {
          code: ErrorCodes.VALIDATION_ERROR,
          message: firstErrorMessage,
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
