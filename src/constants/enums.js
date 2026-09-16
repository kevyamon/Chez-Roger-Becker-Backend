/**
 * Enums et constantes centrales du domaine metier Chez Roger Becker
 * Fichier strictement partage et synchronise avec les regles du cahier des charges.
 */

const UserRole = Object.freeze({
  ADMIN: 'ADMIN',
  DRIVER: 'DRIVER'
});

const DriverStatus = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  BUSY: 'BUSY',
  OFFLINE: 'OFFLINE'
});

const OrderStatus = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  ASSIGNED: 'ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
});

const PromotionType = Object.freeze({
  PERCENTAGE: 'PERCENTAGE',
  FIXED_AMOUNT: 'FIXED_AMOUNT',
  PROMOTIONAL_PRICE: 'PROMOTIONAL_PRICE'
});

const PaymentMethod = Object.freeze({
  CASH_ON_DELIVERY: 'CASH_ON_DELIVERY',
  MOBILE_MONEY: 'MOBILE_MONEY'
});

const PaymentStatus = Object.freeze({
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED'
});

const RestaurantStatus = Object.freeze({
  OPEN: 'OPEN',
  CLOSED: 'CLOSED'
});

const ErrorCodes = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RESTAURANT_CLOSED: 'RESTAURANT_CLOSED',
  DISH_UNAVAILABLE: 'DISH_UNAVAILABLE',
  ORDER_EMPTY: 'ORDER_EMPTY',
  INVALID_LOCATION: 'INVALID_LOCATION',
  INVALID_ORDER_STATUS: 'INVALID_ORDER_STATUS',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_ALREADY_ASSIGNED: 'ORDER_ALREADY_ASSIGNED',
  DRIVER_NOT_AVAILABLE: 'DRIVER_NOT_AVAILABLE',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
});

// Ordre et transitions autorisees dans la machine a etats des commandes
const AllowedOrderTransitions = Object.freeze({
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
  [OrderStatus.ASSIGNED]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
  [OrderStatus.PICKED_UP]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: []
});

module.exports = {
  UserRole,
  DriverStatus,
  OrderStatus,
  PromotionType,
  PaymentMethod,
  PaymentStatus,
  RestaurantStatus,
  ErrorCodes,
  AllowedOrderTransitions
};
