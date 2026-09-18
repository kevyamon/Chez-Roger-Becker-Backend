/**
 * Utilitaire de calcul de l'état d'ouverture en direct du restaurant.
 * Analyse les plages horaires configurées par l'administrateur et le levier manuel d'ouverture.
 */

const DAYS_MAP = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const clean = timeStr.trim().toLowerCase().replace('h', ':');
  const parts = clean.split(':');
  if (parts.length === 0) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parts.length > 1 ? parseInt(parts[1], 10) : 0;
  if (isNaN(hours)) return null;

  return hours * 60 + (isNaN(minutes) ? 0 : minutes);
};

/**
 * Détermine si le restaurant est ouvert en temps réel selon les paramètres administrateur en base.
 * Priorité absolue au levier manuel : si isOpen est false, le restaurant est fermé.
 * Si isOpen est true, l'horaire configuré en base est évalué dynamiquement.
 *
 * @param {Object} restaurant - Document RestaurantSettings.
 * @param {Date} [evalDate] - Date à évaluer.
 * @returns {{ isOpen: boolean, isManuallyClosed: boolean, statusText: string, reason: string, openingHours: string }}
 */
const checkIsRestaurantOpen = (restaurant = {}, evalDate = new Date()) => {
  const openingHours = restaurant?.openingHours || 'Mardi – Dimanche : 11h00 – 23h00 (Fermé le lundi)';

  // 1. Levier manuel : Si la direction a fermé manuellement le restaurant
  if (restaurant?.isOpen === false) {
    return {
      isOpen: false,
      isManuallyClosed: true,
      statusText: 'Nous sommes fermés',
      reason: restaurant.closedMessage || 'Fermé manuellement par la direction',
      openingHours
    };
  }

  // 2. Évaluation des horaires d'ouverture
  if (!openingHours || typeof openingHours !== 'string' || !openingHours.trim()) {
    const defaultOpen = restaurant?.isOpen !== false;
    return {
      isOpen: defaultOpen,
      isManuallyClosed: false,
      statusText: defaultOpen ? 'Nous sommes ouverts' : 'Nous sommes fermés',
      reason: defaultOpen ? 'Ouvert' : 'Fermé',
      openingHours: ''
    };
  }

  const normalized = openingHours
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const currentDay = evalDate.getDay();
  const currentMinutes = evalDate.getHours() * 60 + evalDate.getMinutes();

  // Vérification du jour de fermeture explicite (ex: "fermé le lundi")
  const closedMatch = normalized.match(/ferme\s+le\s+([a-z]+)/i);
  if (closedMatch) {
    const closedDayName = closedMatch[1].trim();
    if (DAYS_MAP[closedDayName] !== undefined && DAYS_MAP[closedDayName] === currentDay) {
      return {
        isOpen: false,
        isManuallyClosed: false,
        statusText: 'Nous sommes fermés',
        reason: `Fermé le ${closedDayName}`,
        openingHours
      };
    }
  }

  // Vérification de la plage horaire (ex: "11h00 - 23h00")
  const timeRangeMatch = normalized.match(/(\d{1,2}(?:[h:]\d{2})?)\s*(?:[-–—]|a|to)\s*(\d{1,2}(?:[h:]\d{2})?)/i);
  if (timeRangeMatch) {
    const startMinutes = parseTimeToMinutes(timeRangeMatch[1]);
    const endMinutes = parseTimeToMinutes(timeRangeMatch[2]);

    if (startMinutes !== null && endMinutes !== null) {
      if (startMinutes <= endMinutes) {
        const isWithin = currentMinutes >= startMinutes && currentMinutes < endMinutes;
        return {
          isOpen: isWithin,
          isManuallyClosed: false,
          statusText: isWithin ? 'Nous sommes ouverts' : 'Nous sommes fermés',
          reason: isWithin ? 'Dans la plage horaire d\'ouverture' : 'En dehors des horaires d\'ouverture',
          openingHours
        };
      }

      // Plage nocturne (ex: 18h00 - 02h00)
      const isWithinOvernight = currentMinutes >= startMinutes || currentMinutes < endMinutes;
      return {
        isOpen: isWithinOvernight,
        isManuallyClosed: false,
        statusText: isWithinOvernight ? 'Nous sommes ouverts' : 'Nous sommes fermés',
        reason: isWithinOvernight ? 'Dans la plage horaire d\'ouverture' : 'En dehors des horaires d\'ouverture',
        openingHours
      };
    }
  }

  const fallbackOpen = restaurant?.isOpen !== false;
  return {
    isOpen: fallbackOpen,
    isManuallyClosed: false,
    statusText: fallbackOpen ? 'Nous sommes ouverts' : 'Nous sommes fermés',
    reason: fallbackOpen ? 'Ouvert' : 'Fermé',
    openingHours
  };
};

module.exports = {
  checkIsRestaurantOpen
};
