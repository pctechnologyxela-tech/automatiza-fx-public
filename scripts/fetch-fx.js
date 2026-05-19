#!/usr/bin/env node
/**
 * Construido por Automatiza.ia — https://automatiza.ia
 * Fetch FX rates desde ExchangeRate-API.com (free tier · no API key)
 * y genera fx.json con subset LATAM + USD/EUR/GBP + metadata.
 *
 * Output: public/fx/latest.json + public/fx/history/YYYY-MM-DD.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SOURCE_URL = 'https://open.er-api.com/v6/latest/USD';

// Monedas que servimos (subset LATAM + internacionales clave)
const SUPPORTED = [
  'USD', 'GTQ', 'MXN', 'HNL', 'NIO', 'CRC', 'COP', 'PEN',
  'CLP', 'ARS', 'BOB', 'UYU', 'PYG', 'BRL', 'DOP', 'VES',
  'EUR', 'GBP',
];

// Símbolos display
const SYMBOLS = {
  USD: '$', GTQ: 'Q', MXN: 'MX$', HNL: 'L', NIO: 'C$',
  CRC: '₡', COP: 'COL$', PEN: 'S/', CLP: 'CLP$',
  ARS: 'AR$', BOB: 'Bs', UYU: 'UY$', PYG: '₲',
  BRL: 'R$', DOP: 'RD$', VES: 'Bs.S',
  EUR: '€', GBP: '£',
};

// Nombres legibles
const NAMES = {
  USD: 'Dólar estadounidense', GTQ: 'Quetzal guatemalteco',
  MXN: 'Peso mexicano', HNL: 'Lempira hondureño',
  NIO: 'Córdoba nicaragüense', CRC: 'Colón costarricense',
  COP: 'Peso colombiano', PEN: 'Sol peruano',
  CLP: 'Peso chileno', ARS: 'Peso argentino (oficial)',
  BOB: 'Boliviano', UYU: 'Peso uruguayo',
  PYG: 'Guaraní paraguayo', BRL: 'Real brasileño',
  DOP: 'Peso dominicano', VES: 'Bolívar venezolano (oficial)',
  EUR: 'Euro', GBP: 'Libra esterlina',
};

// País → moneda preferida (ISO 3166-1 alpha-2)
const COUNTRY_TO_CURRENCY = {
  GT: 'GTQ', MX: 'MXN', HN: 'HNL', NI: 'NIO', CR: 'CRC',
  CO: 'COP', PE: 'PEN', CL: 'CLP', AR: 'ARS', BO: 'BOB',
  UY: 'UYU', PY: 'PYG', BR: 'BRL', DO: 'DOP', VE: 'VES',
  EC: 'USD', SV: 'USD', PA: 'USD', PR: 'USD',
  US: 'USD', CA: 'USD',
  ES: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR', PT: 'EUR',
  GB: 'GBP',
  default: 'USD',
};

// Reglas de redondeo cosmético (números "lindos")
const ROUNDING = {
  USD: { decimals: 2, step: 0.01 },
  EUR: { decimals: 2, step: 0.01 },
  GBP: { decimals: 2, step: 0.01 },
  GTQ: { decimals: 0, step: 1 },
  MXN: { decimals: 0, step: 1 },
  HNL: { decimals: 0, step: 1 },
  NIO: { decimals: 0, step: 1 },
  CRC: { decimals: 0, step: 50 },
  COP: { decimals: 0, step: 100 },
  PEN: { decimals: 2, step: 0.01 },
  CLP: { decimals: 0, step: 50 },
  ARS: { decimals: 0, step: 100 },
  BOB: { decimals: 0, step: 1 },
  UYU: { decimals: 0, step: 1 },
  PYG: { decimals: 0, step: 100 },
  BRL: { decimals: 2, step: 0.01 },
  DOP: { decimals: 0, step: 1 },
  VES: { decimals: 2, step: 0.01 },
};

// Volatility flag (alta = mostrar disclaimer + recomendar pago USD)
const HIGH_VOLATILITY = ['ARS', 'VES'];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log(`[fetch-fx] Consultando ${SOURCE_URL}...`);
  const data = await fetchJson(SOURCE_URL);

  if (data.result !== 'success') {
    throw new Error(`Provider returned non-success: ${data['error-type'] || 'unknown'}`);
  }

  const rates = {};
  for (const code of SUPPORTED) {
    if (data.rates[code] == null) {
      console.warn(`[fetch-fx] WARNING: ${code} no presente en respuesta · seteando null`);
      rates[code] = null;
      continue;
    }
    rates[code] = data.rates[code];
  }

  const output = {
    base: 'USD',
    as_of: data.time_last_update_utc,
    as_of_unix: data.time_last_update_unix,
    next_update_utc: data.time_next_update_utc,
    next_update_unix: data.time_next_update_unix,
    source: 'exchangerate-api.com',
    source_terms: 'https://www.exchangerate-api.com/terms',
    license_attribution: 'Rates by exchangerate-api.com (free tier)',
    generated_at: new Date().toISOString(),
    generator: 'Automatiza.ia · automatiza-fx-public',
    supported: SUPPORTED,
    high_volatility: HIGH_VOLATILITY,
    rates,
    symbols: SYMBOLS,
    names: NAMES,
    country_to_currency: COUNTRY_TO_CURRENCY,
    rounding: ROUNDING,
  };

  const publicDir = path.join(__dirname, '..', 'public', 'fx');
  const historyDir = path.join(publicDir, 'history');
  fs.mkdirSync(historyDir, { recursive: true });

  const latestPath = path.join(publicDir, 'latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(output, null, 2));
  console.log(`[fetch-fx] OK · escrito ${latestPath}`);

  const today = new Date().toISOString().slice(0, 10);
  const historyPath = path.join(historyDir, `${today}.json`);
  fs.writeFileSync(historyPath, JSON.stringify(output, null, 2));
  console.log(`[fetch-fx] OK · escrito ${historyPath}`);

  // Limpiar history >90 días
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const files = fs.readdirSync(historyDir);
  for (const file of files) {
    if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(file)) continue;
    const fileDate = new Date(file.slice(0, 10));
    if (fileDate < ninetyDaysAgo) {
      fs.unlinkSync(path.join(historyDir, file));
      console.log(`[fetch-fx] cleanup · removido history ${file}`);
    }
  }

  console.log(`[fetch-fx] DONE · ${SUPPORTED.length} monedas · base USD · as_of ${data.time_last_update_utc}`);
}

main().catch((err) => {
  console.error('[fetch-fx] FATAL:', err);
  process.exit(1);
});
