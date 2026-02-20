import type { EventCategory } from '../types';

export const ALL_EVENT_CATEGORIES: EventCategory[] = [
  'card',
  'credit',
  'service',
  'transfer',
  'income'
];

export const categoryLabels: Record<EventCategory, string> = {
  card: 'Pago Tarjeta',
  credit: 'Crédito',
  service: 'Servicio',
  transfer: 'Transferencia',
  income: 'Ingreso'
};
