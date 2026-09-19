/**
 * Utilitaires de génération de tokens cryptographiques et d'identifiants métier.
 * Conforme aux exigences de sécurité Yély : haute entropie et identifiants uniques.
 */

const crypto = require('crypto');

/**
 * Génère un identifiant unique aléatoire (JTI) pour les jetons de rafraîchissement.
 * Format : chaîne hexadécimale de 32 caractères (16 octets aléatoires).
 */
const generateJti = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Calcule l'empreinte SHA-256 d'un jeton pour comparaison rapide ou indexation.
 * @param {string} token - Jeton à hacher.
 */
const hashToken = (token) => {
  if (!token) return '';
  return crypto.createHash('sha256').update(String(token)).digest('hex');
};

/**
 * Génère un token de suivi aléatoire haute entropie pour les commandes sans compte.
 * Format : chaîne hexadécimale de 48 caractères (24 octets aléatoires cryptographiques).
 */
const generateTrackingToken = () => {
  return crypto.randomBytes(24).toString('hex');
};

/**
 * Génère un numéro de commande lisible par l'humain.
 * Format : CMD-YYYY-XXXXX (ex: CMD-2026-00421).
 * @param {number} [sequenceNumber] - Numéro incrémentiel ou aléatoire à 5 chiffres.
 */
const generateOrderNumber = (sequenceNumber) => {
  const year = new Date().getFullYear();
  const sequence = sequenceNumber
    ? String(sequenceNumber).padStart(5, '0')
    : String(crypto.randomInt(10000, 99999));
  return `CMD-${year}-${sequence}`;
};

/**
 * Génère un slug URL-friendly propre à partir d'une chaîne de caractères.
 * Supprime les accents, caractères spéciaux et normalise en minuscules.
 * @param {string} text - Texte source à transformer.
 */
const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

module.exports = {
  generateJti,
  hashToken,
  generateTrackingToken,
  generateOrderNumber,
  generateSlug
};
