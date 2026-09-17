/**
 * Utilitaire de calcul de l'état d'ouverture en direct du restaurant.
 * Analyse les plages horaires configurées par l'administrateur et l'état d'ouverture en base.
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
 * @param {Object} restaurant - Document RestaurantSettings.
 * @param {Date} [evalDate] - Date à évaluer.
 * @returns {{ isOpen: boolean, statusText: string, reason: string }}
 */
const checkIsRestaurantOpen = (restaurant = {}, evalDate = new Date()) => {
  if (restaurant?.isOpen === false) {
    return {
      isOpen: false,
      statusText: 'Nous sommes fermés',
      reason: restaurant.closedMessage || 'Fermé par la direction'
    };
  }

  const openingHours = restaurant?.openingHours;
  if (!openingHours || typeof openingHours !== 'string' || !openingHours.trim()) {
    const defaultOpen = restaurant?.isOpen !== false;
    return {
      isOpen: defaultOpen,
      statusText: defaultOpen ? 'Nous sommes ouverts' : 'Nous sommes fermés',
      reason: ''
    };
  }

  const normalized = openingHours
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const currentDay = evalDate.getDay();
  const currentMinutes = evalDate.getHours() * 60 + evalDate.getMinutes();

  // Jours de fermeture explicite (ex: "ferme le lundi")
  const closedMatch = normalized.match(/ferme\s+le\s+([a-z]+)/i);
  if (closedMatch) {
    const closedDayName = closedMatch[1].trim();
    if (DAYS_MAP[closedDayName] !== undefined && DAYS_MAP[closedDayName] === currentDay) {
      return {
        isOpen: false,
        statusText: 'Nous sommes fermés',
        reason: `Fermé le ${closedDayName}`
      };
    }
  }

  // Plage horaire (ex: "11h00 - 23h00")
  const timeRangeMatch = normalized.match(/(\d{1,2}(?:[h:]\d{2})?)\s*(?:[-–—]|a|to)\s*(\d{1,2}(?:[h:]\d{2})?)/i);
  if (timeRangeMatch) {
    const startMinutes = parseTimeToMinutes(timeRangeMatch[1]);
    const endMinutes = parseTimeToMinutes(timeRangeMatch[2]);

    if (startMinutes !== null && endMinutes !== null) {
      if (startMinutes <= endMinutes) {
        const isWithin = currentMinutes >= startMinutes && currentMinutes < endMinutes;
        return {
          isOpen: isWithin,
          statusText: isWithin ? 'Nous sommes ouverts' : 'Nous sommes fermés',
          reason: isWithin ? 'Dans la plage horaire' : 'En dehors des horaires d\'ouverture'
        };
      }

      const isWithinOvernight = currentMinutes >= startMinutes || currentMinutes < endMinutes;
      return {
        isOpen: isWithinOvernight,
        statusText: isWithinOvernight ? 'Nous sommes ouverts' : 'Nous sommes fermés',
        reason: isWithinOvernight ? 'Dans la plage horaire' : 'En dehors des horaires d\'ouverture'
      };
    }
  }

  const fallbackOpen = restaurant?.isOpen !== false;
  return {
    isOpen: fallbackOpen,
    statusText: fallbackOpen ? 'Nous sommes ouverts' : 'Nous sommes fermés',
    reason: ''
  };
};

module.exports = {
  checkIsRestaurantOpen
};
