# Replay Scripts

Scripts for rebuilding credit balances and causaciones from scratch using the
**Excel francesa** formula (`tasa_diaria = tasa_nominal / dias_periodo`).

## When to use

- A credit's `saldo_intereses` is negative or inconsistent.
- `causaciones_diarias` is missing or stale.
- Pagos were registered but daily causación didn't run.
- Need to verify calculations match Excel / SFC convention.

## Scripts

| Script | Use for |
|--------|---------|
| `francesa_replay.js` | Francesa amortization (PMT fija, capital amortiza cada mes) |
| `solo_interes_replay.js` | Solo-interes anticipada (pago anticipado cubre mes siguiente) |

## Setup

```bash
npm install pg   # one-time (if not already installed globally)
```

Connection via env vars. Get DB credentials from Supabase CLI:

```bash
# Get a fresh PG password (valid ~30 min)
npx supabase db dump --linked --dry-run 2>&1 | grep PGPASSWORD
```

## Usage — Francesa

Re-runs using existing pagos in `transacciones`:

```bash
PGHOST=aws-1-eu-west-2.pooler.supabase.com \
PGUSER=cli_login_postgres.vykwfrrtrqpdabsxuist \
PGPASSWORD=<from-supabase-cli> \
CODIGO=CR006 \
node supabase/scripts/replay/francesa_replay.js
```

Or override with custom pagos (recovery mode):

```bash
PGPASSWORD=... CODIGO=CR010 PAGOS='[
  {"fecha":"2026-03-10","total":1088000,"cap":0,"ref":"MANUAL-CR010-2026-03-10"}
]' node supabase/scripts/replay/francesa_replay.js
```

## Usage — Solo-interes anticipada

Always requires PAGOS (plus P, R, DESEMBOLSO):

```bash
PGPASSWORD=... \
CODIGO=CR018 \
P=475000000 \
R=0.019 \
DESEMBOLSO=2025-12-23T00:00:00Z \
PAGOS='[
  {"fecha":"2025-12-23","total":9025000,"cap":0,"ref":"MIG-CR018-2025-12-23-9025000"},
  {"fecha":"2026-01-26","total":9045000,"cap":0,"ref":"MIG-CR018-2026-01-26-9045000"}
]' \
node supabase/scripts/replay/solo_interes_replay.js
```

## Cascada

Both scripts use this waterfall when applying each pago:

```
if pago.cap > 0:
    cap_applied = pago.cap (hint)
    remaining = total - cap
    mora_applied = min(remaining, saldo_mora)
    int_applied = rest  (no clamp, may go negative for prepayments)
else:  # strict francesa
    mora_applied = min(total, saldo_mora)
    remaining = total - mora
    int_applied = min(remaining, saldo_int)  # clamped
    cap_applied = rest
```

For `solo_interes_replay.js`, int is never clamped (allows prepayment).

## Daily causación

Daily rate uses Excel francesa convention:

```
diasPeriodo = days between last payment (or desembolso) and next expected pay date
tasa_diaria = tasa_nominal / diasPeriodo
```

Sum of daily interest over a full monthly period = `saldo × tasa_nominal` exactly.

Mora uses SFC usura EA → daily (365-day basis):

```
tasa_mora_diaria = (1 + usura_ea/100)^(1/365) - 1
```

## ⚠️ Destructive

Each script **DELETES** the following before rebuilding:
- `causaciones_diarias` for the credit
- `causaciones_inversionistas` for the credit
- `transacciones` of types: `pago_mora`, `pago_interes`, `pago_capital`,
  `causacion_interes`, `causacion_mora`

Everything runs in a transaction — rolled back on any error.

**Always verify pagos have been saved elsewhere before running** (audit_log,
external Excel, backup, etc).

## Known limitations

- Uses cached `tasas_oficiales` for usura. Update that table if running for
  dates outside the loaded range.
- Requires `fecha_desembolso` to be set on the credit row.
- For multi-currency or non-COP credits, verify the amount rounding is correct.
