/**
 * Utilitaires de generation de tokens cryptographiques et d'identifiants metier.
 * Conforme aux exigences du cahier des charges : tokens non devinables et numeros lisibles.
 */

const crypto = require('crypto');

/**
 * Genere un token de suivi aleatoire haute entropie pour les commandes sans compte.
 * Format : chaine hexadecimale de 48 caracteres (24 octets aleatoires cryptographiques).
 */
const generateTrackingToken = () => {
  return crypto.randomBytes(24).toString('hex');
};

/**
 * Genere un numero de commande lisible par l'humain.
 * Format : CMD-YYYY-XXXXX (ex: CMD-2026-00421).
 * @param {number} sequenceNumber - Numero incrementiel ou aleatoire a 5 chiffres.
 */
const generateOrderNumber = (sequenceNumber) => {
  const year = new Date().getFullYear();
  const sequence = sequenceNumber 
    ? String(sequenceNumber).padStart(5, '0') 
    : String(crypto.randomInt(10000, 99999));
  return `CMD-${year}-${sequence}`;
};

/**
 * Genere un slug URL-friendly propre a partir d'une chaine de caracteres.
 * Supprime les accents, caracteres speciaux et normalise en minuscules.
 * @param {string} text - Texte source a transformer.
 */
const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Supprime les caracteres non alphanumeriques
    .replace(/[\s_-]+/g, '-') // Remplace espaces et underscores par tirets
    .replace(/^-+|-+$/g, ''); // Supprime tirets en debut et fin
};

module.exports = {
  generateTrackingToken,
  generateOrderNumber,
  generateSlug
};
