import { FinancialEvent, EventDirection, EventCategory } from '../types';


const isDev = import.meta.env.DEV;
const debugLog = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};

interface GmailMessagePart {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload?: {
    mimeType?: string;
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string; size?: number };
    parts?: GmailMessagePart[];
  };
  internalDate: string;
}


// Patrones de emisores financieros conocidos (Chile)
export const DEFAULT_FINANCIAL_SENDERS = [
  // Bancos chilenos
  'banco de chile', 'bancoestado', 'santander', 'bci', 'scotiabank', 'itau', 'falabella', 'security', 'bice', 'consorcio', 'ripley',
  // Pagos y fintech
  'transbank', 'mercadopago', 'mercadolibre', 'paypal', 'tenpo', 'mach', 'fpay', 'flow',
  // Servicios básicos
  'enel', 'chilectra', 'aguas andinas', 'essbio', 'esval', 'metrogas', 'lipigas', 'abastible',
  // Telecomunicaciones
  'entel', 'movistar', 'claro', 'wom', 'vtr', 'gtd', 'mundo',
  // Apps y delivery
  'rappi', 'uber', 'didi', 'cornershop', 'pedidosya',
  // Retail y otros
  'amazon', 'netflix', 'spotify', 'apple', 'google', 'paris', 'lider', 'jumbo', 'sodimac', 'easy', 'cencosud'
];

// Patrones para detectar transacciones en el cuerpo del correo (CLP)
const AMOUNT_PATTERNS = [
  /monto\s*(?:transferido)?[\s\n:]+\$?\s*[\d.]+/gi,  // Monto transferido\n$ 19.843 (Santander)
  /\$\s*[\d.]+(?:,\d{1,2})?/g,                // $1.234.567 o $1.234,50 (formato chileno)
  /CLP\s*[\d.]+/gi,                           // CLP 1.234.567
  /monto[:\s]+\$?\s*[\d.]+/gi,                // Monto: $1.234 o Monto: 1.234
  /total[:\s]+\$?\s*[\d.]+/gi,                // Total: $1.234
  /cargo[:\s]+\$?\s*[\d.]+/gi,                // Cargo: $1.234
  /pago[:\s]+\$?\s*[\d.]+/gi,                 // Pago: $1.234
  /valor[:\s]+\$?\s*[\d.]+/gi,                // Valor: $1.234 (común en Santander)
  /cuota[:\s]+\$?\s*[\d.]+/gi,                // Cuota: $1.234
  /depósito[:\s]+\$?\s*[\d.]+/gi,             // Depósito: $1.234
  /transferencia[:\s]+\$?\s*[\d.]+/gi,        // Transferencia: $1.234
  /abono[:\s]+\$?\s*[\d.]+/gi,                // Abono: $1.234
  /compra\s+(?:por|de)?\s*\$?\s*[\d.]+/gi,    // Compra por $1.234 o Compra de $1.234
  /retiro\s+(?:por|de)?\s*\$?\s*[\d.]+/gi,    // Retiro por $1.234
  /[\d.]+\s*(?:pesos|CLP)/gi                  // 1.234.567 pesos o 1.234 CLP
];

// Palabras clave para determinar dirección (ingreso/egreso)
const INCOME_KEYWORDS = [
  'depósito', 'deposito', 'abono', 'recibido', 'transferencia recibida',
  'pago recibido', 'ingreso', 'nómina', 'nomina', 'sueldo'
];

const EXPENSE_KEYWORDS = [
  'cargo', 'compra', 'pago', 'retiro', 'transferencia enviada',
  'débito', 'debito', 'cobro', 'factura', 'egreso', 'giro',
  'cuota', 'comisión', 'comision', 'mantención', 'mantencion'
];

// Palabras clave que DEBEN estar presentes para considerar como transacción
const TRANSACTION_REQUIRED_KEYWORDS = [
  // Notificaciones de transacciones
  'compra aprobada', 'compra realizada', 'cargo realizado', 'pago exitoso',
  'transferencia exitosa', 'transferencia realizada', 'tef realizada',
  'abono realizado', 'depósito realizado', 'giro realizado',
  'cuota pagada', 'pago de cuota', 'débito automático',
  // Indicadores de monto con contexto de transacción
  'monto transferido', 'monto de la compra', 'monto de la transacción',
  // Notificaciones bancarias típicas de TRANSACCIÓN (no informativas)
  'has realizado una', 'se ha realizado una', 'hemos realizado',
  'desde tu cuenta corriente', 'desde tu cuenta vista',
  // Comprobantes de pago
  'comprobante de pago', 'comprobante de transferencia',
  'voucher de compra', 'recibo de pago',
  // Boletas y facturas (documentos de pago real)
  'boleta electrónica', 'factura electrónica',
  // PAC y débitos
  'pac realizado', 'débito realizado', 'cargo automático realizado'
];

// Palabras que indican que NO es una transacción (marketing, promociones)
const MARKETING_EXCLUSION_KEYWORDS = [
  // Marketing y promociones
  'promoción', 'promocion', 'oferta especial', 'descuento exclusivo',
  'solo por hoy', 'aprovecha', 'no te pierdas', 'beneficio exclusivo',
  'oportunidad', 'exclusivo para ti', 'te invitamos',
  // Newsletters y suscripciones
  'newsletter', 'suscríbete', 'suscribete', 'boletin',
  // Encuestas y feedback
  'encuesta', 'evalúa', 'califica tu experiencia', 'tu opinión',
  // Verificación de cuenta
  'actualiza tus datos', 'verifica tu', 'confirma tu correo',
  'bienvenido a', 'gracias por registrarte', 'activar cuenta',
  // Términos legales
  'términos y condiciones han cambiado', 'política de privacidad',
  // Cartolas y resúmenes (no son transacciones individuales)
  'estado de cuenta disponible', 'tu cartola', 'resumen mensual',
  'cartola trimestral', 'cartola mensual', 'resumen de cuenta',
  // Programas de puntos y fidelización
  'pesos mi club', 'mi club', 'puntos acumulados', 'canjea tus puntos',
  'beneficios cmr', 'recuperar los beneficios', 'acumular puntos',
  // Concursos y sorteos
  'gana entradas', 'participa', 'sorteo', 'concurso', 'últimos días para ganar',
  // Cotizaciones (no son transacciones)
  'cotización', 'cotizacion', 'cotiza', 'simula tu crédito',
  // Ofertas de productos financieros
  'depósito a plazo', 'deposito a plazo', 'tasa anual', 'nuevo producto',
  'te ofrecemos', 'conoce nuestro', 'descubre',
  // Campañas solidarias
  'apoyemos', 'donación', 'donacion', 'causa solidaria',
  // Fidelización
  'no pierdas esta oportunidad', 'imaginas perder', 'podrías perder',
  // Verano/temporadas (campañas estacionales)
  'empezó el verano', 'este verano', 'estas vacaciones',
  // Invitaciones
  'te invitamos a ser parte', 'únete a', 'forma parte de',
  // Mensajes promocionales de regalos
  'mejor regalo para tu hijo', 'regalo para tu hijo'
];

// Ofertas financieras que suelen parecer transacciones, pero no lo son
const CREDIT_OFFER_EXCLUSION_KEYWORDS = [
  'preaprobado', 'pre aprobado', 'pre-aprobado',
  'crédito preaprobado', 'credito preaprobado',
  'crédito aprobado', 'credito aprobado',
  'te aprobamos', 'te preaprobamos',
  'línea de crédito', 'linea de credito',
  'cupo aprobado', 'avance aprobado',
  'simula tu crédito', 'simula tu credito',
  'solicita tu crédito', 'solicita tu credito',
  'oferta de crédito', 'oferta de credito',
  'aprobación de crédito', 'aprobacion de credito'
];

// Expresiones regex para variantes de ofertas de crédito
const CREDIT_OFFER_EXCLUSION_PATTERNS = [
  /pre\s*-?\s*aprobado/i,
  /cr[eé]dito\s+aprobado/i,
  /aprobado\s+tu\s+cr[eé]dito/i,
  /te\s+aprobamos\s+un?\s+cr[eé]dito/i,
  /l[ií]nea\s+de\s+cr[eé]dito/i,
  /cupo\s+aprobado/i,
  /avance\s+aprobado/i
];

// Para fallback: requiere evidencia de movimiento real, no solo lenguaje financiero genérico
const TRANSACTION_ACTION_HINTS = [
  'realizad', 'pagad', 'compr', 'carg', 'debit', 'abon',
  'transferencia recibida', 'transferencia enviada', 'transferencia realizada',
  'te han transferido', 'has recibido', 'giro realizado', 'retiro'
];

// Detectar si el asunto tiene muchos emojis (indicador de marketing)
const hasExcessiveEmojis = (text: string): boolean => {
  // Regex para detectar emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu;
  const emojis = text.match(emojiRegex);
  return emojis !== null && emojis.length >= 2; // 2 o más emojis = marketing
};

// Verificar si el email es una notificación de transacción válida
const isTransactionEmail = (subject: string, body: string): { isValid: boolean; reason: string } => {
  const text = `${subject} ${body}`.toLowerCase();
  const subjectLower = subject.toLowerCase();

  // 1. Verificar emojis excesivos en el asunto (fuerte indicador de marketing)
  if (hasExcessiveEmojis(subject)) {
    return { isValid: false, reason: 'Asunto con múltiples emojis (marketing)' };
  }

  // 2. Verificar exclusiones de marketing
  for (const keyword of MARKETING_EXCLUSION_KEYWORDS) {
    if (text.includes(keyword)) {
      return { isValid: false, reason: `Marketing/no transacción: "${keyword}"` };
    }
  }

  // 2.1 Excluir explícitamente ofertas de crédito/preaprobados
  for (const keyword of CREDIT_OFFER_EXCLUSION_KEYWORDS) {
    if (text.includes(keyword)) {
      return { isValid: false, reason: `Oferta de crédito detectada: "${keyword}"` };
    }
  }
  for (const pattern of CREDIT_OFFER_EXCLUSION_PATTERNS) {
    if (pattern.test(text)) {
      return { isValid: false, reason: 'Patrón de oferta de crédito' };
    }
  }

  // 3. Verificar patrones de asuntos típicos de marketing
  const marketingSubjectPatterns = [
    /^¡.*!$/, // Asuntos que empiezan y terminan con exclamación
    /últimos días/i,
    /no te lo pierdas/i,
    /especial para ti/i,
    /te esperamos/i,
    /mejor regalo para tu hijo/i,
    /regalo para tu hijo/i,
  ];

  for (const pattern of marketingSubjectPatterns) {
    if (pattern.test(subjectLower)) {
      return { isValid: false, reason: `Patrón de marketing en asunto` };
    }
  }

  // 4. Verificar que tenga al menos una palabra clave de transacción
  for (const keyword of TRANSACTION_REQUIRED_KEYWORDS) {
    if (text.includes(keyword)) {
      return { isValid: true, reason: `Transacción detectada: "${keyword}"` };
    }
  }

  // 5. Fallback: requiere keyword financiero + evidencia de movimiento real
  const allFinancialKeywords = [...INCOME_KEYWORDS, ...EXPENSE_KEYWORDS];
  const hasFinancialKeyword = allFinancialKeywords.some((keyword) => text.includes(keyword));
  const hasActionHint = TRANSACTION_ACTION_HINTS.some((hint) => text.includes(hint));
  if (hasFinancialKeyword && hasActionHint) {
    return { isValid: true, reason: 'Keyword financiero + acción de movimiento' };
  }

  return { isValid: false, reason: 'Sin indicadores de transacción' };
};

// Detectar categoría basada en el contenido (Chile)
const categorizeEvent = (subject: string, body: string, sender: string): EventCategory => {
  const text = `${subject} ${body} ${sender}`.toLowerCase();

  // Transferencia entre productos (pago tarjeta de crédito)
  if (text.includes('transferencia entre productos') || text.includes('pago tarjeta')) return 'card';
  // Compras con tarjeta
  if (text.includes('compra') && (text.includes('tarjeta') || text.includes('transbank'))) return 'card';
  // Cuotas de crédito
  if (text.includes('cuota') || (text.includes('crédito') && text.includes('consumo'))) return 'credit';
  // Servicios básicos
  if (text.includes('enel') || text.includes('luz') || text.includes('agua') || text.includes('aguas andinas') ||
      text.includes('gas') || text.includes('metrogas') || text.includes('internet') || text.includes('teléfono') ||
      text.includes('entel') || text.includes('movistar') || text.includes('claro') || text.includes('wom') || text.includes('vtr')) return 'service';
  // Transferencias a terceros
  if (text.includes('transferencia') || text.includes('tef')) return 'transfer';
  // Ingresos
  if (text.includes('depósito') || text.includes('nómina') || text.includes('abono') || text.includes('sueldo')) return 'income';
  // Tarjetas (genérico)
  if (text.includes('tarjeta') || text.includes('card') || text.includes('transbank')) return 'card';

  return 'card'; // Default
};

// Determinar dirección (ingreso/egreso)
const determineDirection = (subject: string, body: string): EventDirection => {
  const text = `${subject} ${body}`.toLowerCase();

  // Frases que definitivamente indican EGRESO (prioridad alta)
  const definiteExpensePhrases = [
    'pago de cuota', 'pago cuota', 'pago exitoso', 'compra aprobada',
    'cargo realizado', 'débito automático', 'debito automatico',
    'transferencia realizada', 'transferencia exitosa', 'tef realizada',
    'pago tarjeta', 'pago de tarjeta', 'retiro', 'giro realizado',
    'cobro realizado', 'factura pagada', 'mantención', 'comisión'
  ];

  for (const phrase of definiteExpensePhrases) {
    if (text.includes(phrase)) {
      debugLog('[Gmail] Dirección: expense (frase definitiva:', phrase, ')');
      return 'expense';
    }
  }

  // Frases que definitivamente indican INGRESO (prioridad alta)
  const definiteIncomePhrases = [
    'depósito recibido', 'deposito recibido', 'abono recibido',
    'transferencia recibida', 'pago recibido', 'ingreso recibido',
    'te han transferido', 'has recibido', 'nómina', 'nomina', 'sueldo'
  ];

  for (const phrase of definiteIncomePhrases) {
    if (text.includes(phrase)) {
      debugLog('[Gmail] Dirección: income (frase definitiva:', phrase, ')');
      return 'income';
    }
  }

  // Contar keywords de cada tipo
  let incomeScore = 0;
  let expenseScore = 0;

  for (const keyword of INCOME_KEYWORDS) {
    if (text.includes(keyword)) incomeScore++;
  }

  for (const keyword of EXPENSE_KEYWORDS) {
    if (text.includes(keyword)) expenseScore++;
  }

  // Si tiene más keywords de gasto, es gasto
  if (expenseScore > incomeScore) {
    debugLog('[Gmail] Dirección: expense (score:', expenseScore, 'vs', incomeScore, ')');
    return 'expense';
  }

  // Si tiene más de ingreso, es ingreso
  if (incomeScore > expenseScore) {
    debugLog('[Gmail] Dirección: income (score:', incomeScore, 'vs', expenseScore, ')');
    return 'income';
  }

  // Por defecto, la mayoría de notificaciones bancarias son gastos
  debugLog('[Gmail] Dirección: expense (default)');
  return 'expense';
};

// Extraer monto del texto (formato chileno: puntos como separadores de miles)
// Parsear monto en formato chileno
const parseChileanAmount = (str: string): number | null => {
  // Remover todo excepto dígitos, puntos y comas
  let clean = str.replace(/[^\d.,]/g, '');

  // En formato chileno: puntos son miles, comas son decimales
  // Ej: "1.234.567" -> 1234567, "1.234,50" -> 1234.50
  clean = clean.replace(/\./g, '').replace(',', '.');

  const amount = parseFloat(clean);
  return (!isNaN(amount) && amount > 0) ? amount : null;
};

const extractAmount = (text: string): number | null => {
  debugLog('[Gmail] Buscando montos en texto de', text.length, 'caracteres');

  // Primero intentar con patrones específicos
  for (const pattern of AMOUNT_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      for (const match of matches) {
        const amount = parseChileanAmount(match);
        if (amount && amount >= 100) { // Mínimo 100 pesos para evitar falsos positivos
          debugLog('[Gmail] ✓ Monto encontrado con patrón:', match, '->', amount);
          return amount;
        }
      }
    }
  }

  // Fallback: buscar cualquier número con formato de pesos chilenos
  // Patrón: $ seguido de número con puntos (ej: $ 19.843 o $1.234.567)
  const fallbackPattern = /\$\s*[\d.]+/g;
  const fallbackMatches = text.match(fallbackPattern);
  if (fallbackMatches) {
    for (const match of fallbackMatches) {
      const amount = parseChileanAmount(match);
      if (amount && amount >= 100) {
        debugLog('[Gmail] ✓ Monto encontrado con fallback:', match, '->', amount);
        return amount;
      }
    }
  }

  // Último intento: buscar números grandes (>= 1000) con puntos como separadores
  const numberPattern = /\b(\d{1,3}(?:\.\d{3})+)\b/g;
  const numberMatches = text.match(numberPattern);
  if (numberMatches) {
    for (const match of numberMatches) {
      const amount = parseChileanAmount(match);
      if (amount && amount >= 1000) {
        debugLog('[Gmail] ✓ Monto encontrado con número grande:', match, '->', amount);
        return amount;
      }
    }
  }

  debugLog('[Gmail] ✗ No se encontró monto válido');
  return null;
};

// Extraer descripción del asunto
const extractDescription = (subject: string, sender: string): string => {
  // Limpiar el asunto
  let description = subject
    .replace(/re:/gi, '')
    .replace(/fwd:/gi, '')
    .replace(/\[.*?\]/g, '')
    .trim();

  // Si es muy largo, truncar
  if (description.length > 50) {
    description = description.substring(0, 47) + '...';
  }

  return description || sender;
};

// Decodificar base64 de Gmail (URL-safe base64)
const decodeBase64 = (data: string): string => {
  try {
    // Convertir URL-safe base64 a base64 estándar
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    // Agregar padding si es necesario
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    // Decodificar usando TextDecoder (reemplaza el deprecated escape())
    const binaryString = atob(padded);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    debugLog('[Gmail] Error decodificando base64:', e);
    return '';
  }
};

// Extraer texto de HTML
const stripHtml = (html: string): string => {
  // Reemplazar <br>, <p>, <div> con saltos de línea
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<\/th>/gi, ' ');

  // Remover todas las etiquetas HTML
  text = text.replace(/<[^>]+>/g, '');

  // Decodificar entidades HTML comunes
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));

  // Limpiar espacios múltiples
  text = text.replace(/\s+/g, ' ').trim();

  return text;
};

// Buscar contenido recursivamente en partes MIME
const findBodyInParts = (parts: any[], preferPlainText = true): string => {
  let htmlContent = '';
  let plainContent = '';

  for (const part of parts) {
    const mimeType = part.mimeType || '';

    // Si tiene sub-partes, buscar recursivamente
    if (part.parts && part.parts.length > 0) {
      const nestedContent = findBodyInParts(part.parts, preferPlainText);
      if (nestedContent) {
        if (preferPlainText && plainContent === '') {
          plainContent = nestedContent;
        } else if (!htmlContent) {
          htmlContent = nestedContent;
        }
      }
    }

    // Extraer contenido de esta parte
    if (part.body?.data) {
      const decoded = decodeBase64(part.body.data);
      if (mimeType === 'text/plain') {
        plainContent = decoded;
      } else if (mimeType === 'text/html') {
        htmlContent = decoded;
      } else if (!plainContent && !htmlContent) {
        // Contenido sin tipo específico
        plainContent = decoded;
      }
    }
  }

  // Preferir texto plano, sino usar HTML strippeado
  if (plainContent) {
    return plainContent;
  }
  if (htmlContent) {
    return stripHtml(htmlContent);
  }
  return '';
};

// Obtener el cuerpo del mensaje
const getMessageBody = (message: GmailMessage): string => {
  let body = '';

  // Caso 1: Cuerpo directo en payload
  if (message.payload?.body?.data) {
    body = decodeBase64(message.payload.body.data);
    const mimeType = message.payload?.mimeType || '';
    if (mimeType.includes('html')) {
      body = stripHtml(body);
    }
  }
  // Caso 2: Partes MIME
  else if (message.payload?.parts) {
    body = findBodyInParts(message.payload.parts);
  }

  // Fallback: usar snippet
  if (!body && message.snippet) {
    body = message.snippet;
  }

  debugLog('[Gmail] Cuerpo extraído (primeros 200 chars):', body.substring(0, 200));
  return body;
};

// Obtener header específico
const getHeader = (message: GmailMessage, name: string): string => {
  const header = message.payload?.headers?.find(h =>
    h.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value || '';
};

// Mapeo de categorías a iconos
const categoryIcons: Record<EventCategory, { icon: string; iconColor: string; bgColor: string }> = {
  card: { icon: 'credit_card', iconColor: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/30' },
  credit: { icon: 'account_balance', iconColor: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-900/30' },
  service: { icon: 'receipt_long', iconColor: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/30' },
  transfer: { icon: 'swap_horiz', iconColor: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/30' },
  income: { icon: 'payments', iconColor: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-900/30' }
};

export interface ExclusionRules {
  senders: string[];
  keywords: string[];
  subjects: string[];
}

const findExclusionMatch = (
  from: string,
  subject: string,
  body: string,
  exclusionRules: ExclusionRules
): string | null => {
  const fromLower = from.toLowerCase();
  const subjectLower = subject.toLowerCase();
  const text = `${subject} ${body}`.toLowerCase();

  for (const sender of exclusionRules.senders) {
    if (fromLower.includes(sender)) {
      return `Emisor bloqueado: "${sender}"`;
    }
  }

  for (const subjectRule of exclusionRules.subjects) {
    if (subjectLower.includes(subjectRule)) {
      return `Asunto bloqueado: "${subjectRule}"`;
    }
  }

  for (const keyword of exclusionRules.keywords) {
    if (text.includes(keyword)) {
      return `Keyword bloqueada: "${keyword}"`;
    }
  }

  return null;
};

export const quoteForGmailQuery = (value: string): string => {
  const normalized = value
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const escaped = normalized.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
};

// Convertir mensaje de Gmail a evento financiero
export const messageToEvent = (
  message: GmailMessage,
  allowedSenders: string[],
  exclusionRules: ExclusionRules
): FinancialEvent | null => {
  const subject = getHeader(message, 'Subject');
  const from = getHeader(message, 'From');
  const body = getMessageBody(message);
  const fullText = `${subject} ${body}`;

  // Validar que tenemos los headers necesarios
  if (!from || from.trim() === '') {
    debugLog('[Gmail] ❌ Header "From" vacío o faltante');
    return null;
  }

  if (!subject || subject.trim() === '') {
    debugLog('[Gmail] ❌ Header "Subject" vacío o faltante');
    return null;
  }

  debugLog('[Gmail] Procesando mensaje:', { subject: subject.substring(0, 60), from: from.substring(0, 40) });

  const exclusionMatch = findExclusionMatch(from, subject, body, exclusionRules);
  if (exclusionMatch) {
    debugLog('[Gmail] ❌ Regla de bloqueo aplicada:', exclusionMatch, '| Asunto:', subject.substring(0, 40));
    return null;
  }

  // Verificar si es de un emisor permitido (predeterminados + personalizados)
  const isAllowedSender = allowedSenders.some(sender =>
    from.toLowerCase().includes(sender.toLowerCase())
  );

  if (!isAllowedSender) {
    debugLog('[Gmail] ❌ Emisor no permitido:', from.substring(0, 50));
    return null;
  }

  // Verificar si es un email de transacción (no marketing)
  const transactionCheck = isTransactionEmail(subject, body);
  if (!transactionCheck.isValid) {
    debugLog('[Gmail] ❌ No es transacción:', transactionCheck.reason, '| Asunto:', subject.substring(0, 40));
    return null;
  }

  debugLog('[Gmail] ✓ Es transacción:', transactionCheck.reason);

  // Extraer monto
  const amount = extractAmount(fullText);
  if (!amount) {
    debugLog('[Gmail] ❌ No se encontró monto en:', subject.substring(0, 50));
    return null;
  }

  debugLog('[Gmail] ✓ Monto extraído:', amount);

  // Determinar dirección y categoría
  const direction = determineDirection(subject, body);
  const category = categorizeEvent(subject, body, from);
  debugLog('[Gmail] ✓ Categoría:', category, '| Dirección:', direction);

  // Formatear fecha
  const date = new Date(parseInt(message.internalDate));
  const isoDate = date.toISOString().split('T')[0];
  const displayDate = date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

  // Extraer nombre del emisor
  const senderMatch = from.match(/^([^<]+)/);
  const source = senderMatch ? senderMatch[1].trim() : from.split('@')[0];

  // Obtener icono según categoría
  const iconConfig = categoryIcons[category];

  return {
    id: message.id,
    date: isoDate,
    displayDate,
    amount,
    direction,
    category,
    source,
    description: extractDescription(subject, source),
    icon: iconConfig.icon,
    iconColorClass: iconConfig.iconColor,
    bgColorClass: iconConfig.bgColor
  };
};
