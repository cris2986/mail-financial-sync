import type { FinancialEvent } from '../types';

const NOTIFICATION_TAG = 'mail-financial-sync-events';

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getCurrentNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  return Notification.requestPermission();
};

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

const buildNotificationBody = (events: FinancialEvent[]): string => {
  if (events.length === 1) {
    const event = events[0];
    const directionLabel = event.direction === 'income' ? 'Ingreso' : 'Egreso';
    return `${directionLabel}: ${event.description} por $${formatCurrency(event.amount)}`;
  }

  const total = events.reduce((acc, event) => acc + event.amount, 0);
  return `Se detectaron ${events.length} movimientos por un total de $${formatCurrency(total)}.`;
};

export const notifyNewEvents = async (events: FinancialEvent[]): Promise<void> => {
  if (events.length === 0) return;
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  const title = events.length === 1
    ? 'Nueva transacción detectada'
    : `${events.length} nuevas transacciones detectadas`;
  const body = buildNotificationBody(events);

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.showNotification(title, {
        body,
        tag: NOTIFICATION_TAG,
        data: { url: '/dashboard' }
      });
      return;
    }
  }

  new Notification(title, {
    body,
    tag: NOTIFICATION_TAG
  });
};
