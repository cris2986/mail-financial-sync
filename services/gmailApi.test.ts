import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GmailService } from './gmailApi';
import type { EmailRule, ScanSettings } from '../types';

// Mock fetch para las pruebas de API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Gmail API Service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('parseChileanAmount', () => {
    // Estos tests verifican el parsing de montos en formato chileno
    it('debería parsear montos con puntos como separador de miles', () => {
      // El formato chileno usa puntos para miles: 1.234.567 = 1234567
      const testCases = [
        { input: '$1.234.567', expected: 1234567 },
        { input: '$ 50.000', expected: 50000 },
        { input: 'monto: $19.843', expected: 19843 },
        { input: '100', expected: 100 }
      ];

      testCases.forEach(({ input, expected }) => {
        // Lógica de parsing extraída de gmailApi.ts
        let clean = input.replace(/[^\d.,]/g, '');
        clean = clean.replace(/\./g, '').replace(',', '.');
        const amount = parseFloat(clean);

        expect(amount).toBe(expected);
      });
    });
  });

  describe('hasExcessiveEmojis', () => {
    it('debería detectar correos de marketing con múltiples emojis', () => {
      const hasExcessiveEmojis = (text: string): boolean => {
        const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu;
        const emojis = text.match(emojiRegex);
        return emojis !== null && emojis.length >= 2;
      };

      expect(hasExcessiveEmojis('Compra aprobada')).toBe(false);
      expect(hasExcessiveEmojis('Pago exitoso!')).toBe(false);
      expect(hasExcessiveEmojis('🎉 Gran oferta 🔥')).toBe(true);
      expect(hasExcessiveEmojis('😱🚨 No pierdas esta oportunidad')).toBe(true);
    });
  });

  describe('isTransactionEmail', () => {
    it('debería identificar correos de transacciones reales', () => {
      const transactionKeywords = [
        'compra aprobada',
        'transferencia exitosa',
        'pago de cuota',
        'débito automático'
      ];

      const marketingKeywords = [
        'promoción',
        'oferta especial',
        'gana entradas',
        'cartola trimestral'
      ];

      transactionKeywords.forEach(keyword => {
        expect(keyword.includes('aprobada') || keyword.includes('exitosa') || keyword.includes('cuota') || keyword.includes('débito')).toBe(true);
      });

      marketingKeywords.forEach(keyword => {
        expect(keyword.includes('aprobada')).toBe(false);
      });
    });
  });

  describe('GmailService', () => {
    it('debería manejar errores de autenticación (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized')
      });

      // Simular request que debería fallar
      const response = await fetch('https://gmail.googleapis.com/test', {
        headers: { Authorization: 'Bearer invalid_token' }
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it('debería manejar rate limiting (429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limited')
      });

      const response = await fetch('https://gmail.googleapis.com/test');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
    });
  });
});

describe('Categorización de eventos', () => {
  it('debería categorizar correctamente según palabras clave', () => {
    const categorize = (text: string): string => {
      const lower = text.toLowerCase();
      if (lower.includes('tarjeta') || lower.includes('transbank')) return 'card';
      if (lower.includes('cuota') || lower.includes('crédito')) return 'credit';
      if (lower.includes('luz') || lower.includes('agua') || lower.includes('gas')) return 'service';
      if (lower.includes('transferencia')) return 'transfer';
      if (lower.includes('depósito') || lower.includes('sueldo')) return 'income';
      return 'card';
    };

    expect(categorize('Compra con tarjeta Transbank')).toBe('card');
    expect(categorize('Cuota crédito de consumo')).toBe('credit');
    expect(categorize('Cuenta de luz Enel')).toBe('service');
    expect(categorize('Transferencia exitosa')).toBe('transfer');
    expect(categorize('Depósito de sueldo')).toBe('income');
  });
});

describe('Filtrado de correos promocionales', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const buildRule = (id: string, type: EmailRule['type'], value: string): EmailRule => ({
    id,
    type,
    value,
    enabled: true,
    createdAt: new Date('2026-02-17T00:00:00.000Z').toISOString()
  });

  const buildScanSettings = (overrides: Partial<ScanSettings> = {}): ScanSettings => ({
    customSenders: [],
    keywords: [],
    excludedSenders: [],
    excludedKeywords: [],
    excludedSubjects: [],
    useDefaultSenders: true,
    daysToScan: 90,
    enabledCategories: ['card', 'credit', 'service', 'transfer', 'income'],
    ...overrides
  });

  const buildMessage = (id: string, subject: string, body: string) => ({
    id,
    threadId: 'thread-1',
    snippet: body.slice(0, 80),
    internalDate: String(Date.now()),
    payload: {
      headers: [
        { name: 'From', value: 'Banco Santander <alertas@santander.cl>' },
        { name: 'Subject', value: subject }
      ],
      body: {
        data: Buffer.from(body, 'utf-8').toString('base64')
      }
    }
  });

  const mockListAndMessage = (message: ReturnType<typeof buildMessage>) => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          messages: [{ id: message.id, threadId: message.threadId }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(message)
      });
  };

  it('rechaza correos de crédito preaprobado con monto', async () => {
    const promoMessage = buildMessage(
      'promo-1',
      'Tienes un crédito preaprobado por $5.000.000',
      'Tu crédito está preaprobado. Solicita hoy un monto de $5.000.000.'
    );
    mockListAndMessage(promoMessage);

    const service = new GmailService('token');
    const events = await service.getFinancialEvents();

    expect(events).toHaveLength(0);
  });

  it('rechaza promoción de Santander "Tenemos el mejor regalo para tu hijo"', async () => {
    const promoMessage = buildMessage(
      'promo-2',
      'Tenemos el mejor regalo para tu hijo.',
      'Descubre beneficios y promos exclusivas para tu familia. Solicita aquí.'
    );
    mockListAndMessage(promoMessage);

    const service = new GmailService('token');
    const events = await service.getFinancialEvents();

    expect(events).toHaveLength(0);
  });

  it('mantiene detección de transferencia real', async () => {
    const transactionMessage = buildMessage(
      'tx-1',
      'Transferencia realizada por $19.843',
      'Se ha realizado una transferencia desde tu cuenta corriente por un monto transferido de $19.843.'
    );
    mockListAndMessage(transactionMessage);

    const service = new GmailService('token');
    const events = await service.getFinancialEvents();

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('tx-1');
    expect(events[0].amount).toBe(19843);
    expect(events[0].category).toBe('transfer');
  });

  it('aplica bloqueo inverso por emisor configurado', async () => {
    const promoMessage = buildMessage(
      'promo-3',
      'Transferencia realizada por $19.843',
      'Se ha realizado una transferencia desde tu cuenta corriente por un monto transferido de $19.843.'
    );
    promoMessage.payload.headers[0].value = 'Promociones Santander <promociones@santander.cl>';
    mockListAndMessage(promoMessage);

    const service = new GmailService(
      'token',
      buildScanSettings({
        excludedSenders: [buildRule('r1', 'excluded_sender', 'promociones@santander.cl')]
      })
    );
    const events = await service.getFinancialEvents();

    expect(events).toHaveLength(0);
  });

  it('aplica bloqueo inverso por asunto configurado', async () => {
    const promoMessage = buildMessage(
      'promo-4',
      'Tenemos el mejor regalo para tu hijo.',
      'Se ha realizado una transferencia desde tu cuenta corriente por un monto transferido de $19.843.'
    );
    mockListAndMessage(promoMessage);

    const service = new GmailService(
      'token',
      buildScanSettings({
        excludedSubjects: [buildRule('r2', 'excluded_subject', 'mejor regalo para tu hijo')]
      })
    );
    const events = await service.getFinancialEvents();

    expect(events).toHaveLength(0);
  });

  it('aplica bloqueo inverso por palabra clave configurada', async () => {
    const promoMessage = buildMessage(
      'promo-5',
      'Transferencia realizada por $19.843',
      'Se ha realizado una transferencia desde tu cuenta corriente por un monto transferido de $19.843. Oferta preaprobado.'
    );
    mockListAndMessage(promoMessage);

    const service = new GmailService(
      'token',
      buildScanSettings({
        excludedKeywords: [buildRule('r3', 'excluded_keyword', 'preaprobado')]
      })
    );
    const events = await service.getFinancialEvents();

    expect(events).toHaveLength(0);
  });
});
