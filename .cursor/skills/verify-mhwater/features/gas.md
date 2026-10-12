# Gas / LPG

The Gas page estimates kilograms of LPG for cooking, heating, a gas fridge, and hot water, then turns that into days on a bottle and how many bottles the trip needs.

## Sub-features

- `gas-preset-weekend-summer` applies Weekend summer: cooking only, butane, 4.5 kg bottle.
- `gas-bottle-days` divides bottle kilograms by daily kilograms.
- `gas-bottles-needed` rounds the trip total up to whole bottles.
- `gas-display-rounding` shows bottle days with no fraction digits once the raw value is 10 or more.

## How to get to it (user POV)

- Open `https://motorhomewater.co.uk/gas.html` and follow the redirect to `https://motorhometools.co.uk/water/gas.html`.
- From the Water page, choose **Gas** in the bar labelled Main tools.
- Choose **Weekend summer (cooking only · 2 days)**. The accessible name is built in `assets/gas-app.js` from `assets/gas-defaults.js`.

## Driving it with mhwater-verify

Preconditions:

- Doctor has passed.
- New Chrome profile, viewport 1280×900, rotate gate hidden.

- **Weekend summer.** Run `.cursor/skills/verify-mhwater/scripts/drive.mjs gas`. That opens `/gas.html` on the UI port and clicks `button[aria-label="Weekend summer (cooking only · 2 days)"]`.

### INPUT

`PRESETS.weekendSummer.usage` in `assets/gas-defaults.js`:

- adults 2, children 0, tripDays 2, season summer
- mealsPerDay 2, cookingStyle normal
- heatingLevel off, heatingHours 0
- fridgeGasEnabled false, boilerEnabled false
- gasType butane, bottleId butane45, bottleKg 4.5

### EXPECTED

Derived from `calcGas` in `assets/gas-calc.js`. Cooking uses `COOK_STYLES.normal.kgPerPersonPerMeal` 0.04. Heating uses `HEATER_KG_PER_HOUR` 0.18, fridge `FRIDGE_KG_PER_HOUR` 0.016, boiler `BOILER_KG_PER_HOUR` 0.12. Fridge and boiler are off, so their daily kilograms are 0 even if an hour field would otherwise be non-zero. Display formatting is `formatKg` and `formatDays` in `assets/gas-app.js`. `formatKg` uses 2 fraction digits below 10. `formatDays` uses 0 fraction digits at 10 or above, so 28.125 days is shown as 28. Bottle count is `Math.ceil(tripKg / bottleKg - 1e-9)`.

- peopleUnits = 2 + 0 × 0.7 = 2
- cookDaily = 2 × 2 × 0.04 = 0.16
- heatDaily = 0 × 0.18 = 0
- fridgeDaily = 0
- boilerDaily = 0
- dailyKg = 0.16
- tripKg = 0.16 × 2 = 0.32
- bottleDays = 4.5 / 0.16 = 28.125, shown as 28
- bottlesNeeded = ceil(0.32 / 4.5 − 1e-9) = 1

The named bottle label is `4.5 kg` plus `Calor butane` from `BOTTLES.butane45`.

| Node | EXPECTED text |
| --- | --- |
| `#total-trip` | 0.32 |
| `#total-daily` | 0.16 |
| `#bottle-days` | 28 |
| `#bottle-hint` | A 4.5 kg Calor butane lasts about 28 days at this daily use. |
| `#bottles-needed` | 1 |
| `#bottles-unit` | bottle |
| `#bottles-hint` | One 4.5 kg Calor butane covers the trip (rounded up). |

`expect.mjs gas` prints this case. `moduleAgrees` is the check against `calcGas`.

### ACTUAL

`evidence/gas.json` field `actual`, with `gas-before.png`, `gas-after.png`, and `gas.aria.txt`. `pass` is true only when each node matches the table.

Authoring run `2026-10-12T02-34-18-261Z` recorded `pass: true`. The page title was `Motorhome gas / LPG calculator | kg and bottle days`. ACTUAL text:

| Node | ACTUAL text |
| --- | --- |
| `#total-trip` | 0.32 |
| `#total-daily` | 0.16 |
| `#bottle-days` | 28 |
| `#bottle-hint` | A 4.5 kg Calor butane lasts about 28 days at this daily use. |
| `#bottles-needed` | 1 |
| `#bottles-unit` | bottle |
| `#bottles-hint` | One 4.5 kg Calor butane covers the trip (rounded up). |

## Gotchas

- The same kilogram rates are used for butane and propane. This is not an energy-density model (`assets/gas-calc.js` header).
- The screen can show 28 days when the raw bottle life is 28.125. Compare ACTUAL to the formatted EXPECTED, and use `derivation.bottleDays` for the unrounded figure.
- Winter week locks propane and the 13 kg bottle (`applySeasonToUsage`). Do not assume Weekend summer's 4.5 kg bottle survives a Winter click.
- People and trip length on Gas can differ from the Water page once a Gas preset sets its own values. A shared `localStorage` profile is why each drive uses a new Chrome profile.
- Heating, fridge, and boiler add nothing while their switches or levels are off. Hours left in the form do not count until the feature is on.
