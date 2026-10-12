# Holding tanks

The Tanks page takes daily fresh, grey, and cassette litres from the Water profile and the tank sizes on this page, then shows which tank ends the stretch.

## Sub-features

- `tanks-preset-typical` applies Typical UK van on a fresh Water profile.
- `tanks-limiter` names the tank with the fewest days.
- `tanks-water-link` keeps Water's shower and flush rates when only the tank preset changes.

## How to get to it (user POV)

- Open `https://motorhomewater.co.uk/tanks.html`, which redirects to `https://motorhometools.co.uk/water/tanks.html`.
- From Water, choose **Tanks** in the bar labelled Main tools.
- Choose **Typical UK van (100 L fresh · cassette)**.

## Driving it with mhwater-verify

Preconditions:

- Doctor has passed.
- The Chrome profile has never opened Water, Gas, Tanks, or Cassette in this drive. Water habits must be `createDefaultUsage()` in `assets/defaults.js`: 2 adults, 0 children, 2 trip days, short shower 6 L, 0.5 showers per person, 5 L washing up, laundry off, 2.5 L drinking, cassette on, **5** flushes at 0.25 L, 100 L fresh tank.
- Viewport 1280×900, rotate gate hidden.

- **Typical UK van.** Run `.cursor/skills/verify-mhwater/scripts/drive.mjs tanks`. That opens `/tanks.html` and clicks `button[aria-label="Typical UK van (100 L fresh · cassette)"]`.

### INPUT

Water side, fresh profile (`createDefaultUsage()`), which `calcWater` turns into daily litres. Tank side, `PRESETS.typicalUk.usage` in `assets/tank-defaults.js`:

- tripDays 3
- freshTankLitres 100, freshStartPercent 100
- greyTankLitres 90, greyStartPercent 0
- blackKind cassette, blackTankLitres 19, blackStartPercent 0

`applyTankPreset` in `assets/storage.js` copies the fresh tank size back onto the Water profile. It does not replace shower or flush rates with the Weekend preset.

### EXPECTED

Daily litres come from `calcWater` on the default Water profile. Days come from `calcTanks` in `assets/tank-calc.js`: usable litres divided by the daily rate. Usable fresh is the full 100 L. Usable grey is 90 L. Usable cassette is 19 L. Display formatting is `formatDays` and `formatLitres` in `assets/tank-app.js`. Days below 10 use 1 fraction digit unless the value is within 0.05 of an integer.

- showerDaily = 2 × 0.5 × 6 = 6
- washDaily = 5
- drinkDaily = 2 × 2.5 = 5
- cassetteDaily = 2 × 5 × 0.25 = 2.5
- freshDaily = 6 + 5 + 0 + 5 + 2.5 = 18.5
- greyDaily = 18.5 − 5 − 2.5 = 11
- daysFresh = 100 / 18.5 = 5.405… shown as 5.4
- daysGrey = 90 / 11 = 8.181… shown as 8.2
- daysBlack = 19 / 2.5 = 7.6 shown as 7.6
- The smallest day count is fresh, so the limiter id is `fresh` and the verb from `calcTanks` is `runs dry`.

| Node | EXPECTED text |
| --- | --- |
| `#stretch-days` | 5.4 |
| `#fresh-days` | 5.4 |
| `#grey-days` | 8.2 |
| `#black-days` | 7.6 |
| `#stretch-hint` | Fresh tank runs dry first, after about 5.4 days. That is the limit of this stretch. |
| `#water-summary` | 2 adults · 18.5 L fresh a day · 11 L grey a day · 2.5 L into the cassette a day. Change showers and habits on the Water page. |

`expect.mjs tanks` prints this case. The 19 L cassette in the day-count is the Typical UK preset, not the 18 L default in `tank-calc.js`.

### ACTUAL

`evidence/tanks.json` field `actual`, with `tanks-before.png`, `tanks-after.png`, and `tanks.aria.txt`.

## Gotchas

- Clicking Weekend on Water first changes flush rate from 5 to 4 and changes every day count on this page. This case requires a fresh profile.
- `tests/tank-calc.test.js` pairs Typical UK tanks with the Weekend water preset in one unit test (`19 / cassetteDaily` where that daily rate is the Weekend rate). The page does not do that pairing unless Water was set to Weekend. Do not use that test's day count as the screen EXPECTED for a fresh visit.
- Grey usable space is empty capacity (`1 - startPercent`). Fresh usable space is the filled amount (`startPercent`). A grey tank that starts full has 0 days.
- Tank size fields commit on blur (`assets/ui.js`). A half-typed size is not the value `calcTanks` is using yet.
- Trip length on this preset is 3 days. The Water default trip length is 2 days. Daily rates do not depend on trip length; fills and empties for the trip do.
