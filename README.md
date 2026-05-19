# automatiza-fx-public

Tipos de cambio diarios (USD base) servidos como JSON estático para consumo cross-project Automatiza.ia.

## Endpoints

- **Latest:** `https://pctechnologyxela-tech.github.io/automatiza-fx-public/fx/latest.json`
- **Histórico:** `https://pctechnologyxela-tech.github.io/automatiza-fx-public/fx/history/YYYY-MM-DD.json` (90 días retroactivo)

## Schema

Ver `public/fx/latest.json` — incluye:

- `base`: `USD`
- `as_of`, `as_of_unix`, `next_update_utc`: timestamps oficiales del proveedor.
- `rates`: 18 monedas (USD · 16 LATAM · EUR · GBP).
- `symbols`, `names`: para display UI.
- `country_to_currency`: mapping ISO 3166-1 alpha-2 → moneda preferida.
- `rounding`: reglas de redondeo cosmético por moneda.
- `high_volatility`: `["ARS", "VES"]` — recomendar pago USD.

## Operación

Actualizado automáticamente vía GitHub Action diario (`30 0 * * *` UTC).

Trigger manual:
```bash
gh workflow run update-fx.yml --repo pctechnologyxela-tech/automatiza-fx-public
```

Trigger local (para test):
```bash
node scripts/fetch-fx.js
```

## Fuente

ExchangeRate-API.com — free tier público sin API key · 1500 req/mo (usamos ~30/mo).

## Licencia

Atribución required: "Rates by exchangerate-api.com (free tier)".

## Construido por

[Automatiza.ia](https://automatiza.ia) — agencia de investigación, diseño y automatización con IA para PyMEs y empresas en LATAM.
