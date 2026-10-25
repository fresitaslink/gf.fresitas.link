/**
 * GLYZO market configuration — single source of truth for country settings.
 * Phase 1 foundation (Directive 4). Amounts in the app must be resolved
 * against a market's currency; MXN is never a valid default.
 *
 * IMPORTANT: tax values here are structural placeholders. Actual rates must be
 * confirmed by the business with a tax advisor before charging customers.
 */

export const MARKETS = {
  US: {
    countryCode: 'US',
    name: 'United States',
    name_es: 'Estados Unidos',
    currency: 'USD',
    currencySymbol: '$',
    tax: {
      mode: 'state_local',
      defaultRate: null, // pending verified per-state treatment (e.g. CDTFA rules for CA)
      note: 'US food sales/delivery taxes vary by state and locality. Must be configured per delivery zone before launch.',
    },
    addressFormat: ['street', 'city', 'state', 'zip'],
    paymentMethods: {
      stripe: true,
      cash: false,
      bank_transfer: false,
    },
    deliveryZones: [], // per-zone pricing to be configured in later phases
  },
  GT: {
    countryCode: 'GT',
    name: 'Guatemala',
    name_es: 'Guatemala',
    currency: 'GTQ',
    currencySymbol: 'Q',
    tax: {
      mode: 'iva',
      defaultRate: 0.12, // general IVA rate — final treatment must be verified by the business
      note: '12% IVA is Guatemala\u2019s general rate; the applicable treatment for prepared food and delivery must be confirmed.',
    },
    addressFormat: ['street', 'zone', 'municipality', 'department'],
    paymentMethods: {
      stripe: false, // Stripe does not currently support GT merchant onboarding — a local processor is required
      cash: true,
      bank_transfer: true,
    },
    deliveryZones: [],
  },
};

export const SUPPORTED_COUNTRIES = Object.keys(MARKETS);
export const DEFAULT_MARKET = 'US';

export function getMarket(countryCode) {
  return MARKETS[countryCode] || null;
}

export function formatMoney(amount, currencyCode) {
  const market = Object.values(MARKETS).find(m => m.currency === currencyCode);
  const symbol = market ? market.currencySymbol : '';
  const value = (Number(amount) || 0).toFixed(2);
  return symbol ? `${symbol}${value}` : `${value} ${currencyCode}`;
}