# Cassette

The Cassette page estimates how many days of flush water fit in the remaining cassette or black tank, and how many empties the trip needs.

## Sub-features

- `cassette-preset-weekend` applies Weekend couple.
- `cassette-days` divides remaining room by daily flush litres.
- `cassette-empties` counts dumps for the trip, including one at the end when anything is in the tank.
- `cassette-display` shows whole litres under 10 with one fraction digit (`2.0`, not `2`).

## How to get to it (user POV)

- Open `https://motorhomewater.co.uk/cassette.html`, which redirects to `https://motorhometools.co.uk/water/cassette.html`.
- From Water, choose **Cassette** in the bar labelled Main tools.
- Choose **Weekend couple (2 people · 18 L)**.

## Driving it with mhwater-verify

Preconditions:

- Doctor has passed.
- New Chrome profile, viewport 1280×900, rotate gate hidden.
- This case does not need a prior Water visit. The Weekend couple preset carries its own people, flushes, and tank size (`assets/cassette-defaults.js`).

- **Weekend couple.** Run `.cursor/skills/verify-mhwater/scripts/drive.mjs cassette`. That opens `/cassette.html` and clicks `button[aria-label="Weekend couple (2 people · 18 L)"]`.

### INPUT

`PRESETS.weekendCouple.usage`:

- adults 2, children 0, tripDays 2
- blackKind cassette, blackTankLitres 18, startPercent 0
- flushesPerPersonPerDay 4, litresPerFlush 0.25

### EXPECTED

Derived from `calcCassette` in `assets/cassette-calc.js`. Daily waste is heads × flushes × litres per flush. Heads are adults plus children, with no 0.7 factor. Remaining room is tank litres × (1 − startPercent / 100). Empties are `Math.ceil((startLitres + wasteTrip) / tankLitres - 1e-9)` with start litres 0. Display formatting is `formatLitres` and `formatDays` in `assets/cassette-app.js`. For litres, values from 1 up to but not including 100 use at most 1 fraction digit, and values under 10 also have a minimum of 1, so 2 and 4 are shown as `2.0` and `4.0`. 18 is shown as `18`. 0.25 is under 1, so it uses 2 fraction digits. Days under 10 that are within 0.05 of an integer are shown with no fraction digits, so 9 stays `9`.

- heads = 2
- wasteDaily = 2 × 4 × 0.25 = 2
- wasteTrip = 2 × 2 = 4
- usable = 18 × (1 − 0) = 18
- daysUntilEmpty = 18 / 2 = 9
- emptiesNeeded = ceil((0 + 4) / 18 − 1e-9) = 1
- extraEmpties = 0, and `emptiesNeeded` is 1, so the hint is the single-empty sentence in `emptiesHint`

| Node | EXPECTED text |
| --- | --- |
| `#empty-days` | 9 |
| `#empty-hint` | 18 L of room · 2.0 L / day. |
| `#waste-daily` | 2.0 |
| `#waste-daily-hint` | 8 flushes a day · 0.25 L each. |
| `#waste-trip` | 4.0 |
| `#empties-needed` | 1 |
| `#empties-unit` | empty |
| `#empties-hint` | One empty covers the trip — usually at the end, or when you pass a service point. |

`expect.mjs cassette` prints this case.

### ACTUAL

`evidence/cassette.json` field `actual`, with `cassette-before.png`, `cassette-after.png`, and `cassette.aria.txt`.

## Gotchas

- Flush litres do not use the 0.7 child factor. That factor belongs to Water showers and drinking, and to Gas cooking.
- `formatLitres` on this page shows `2.0` for two litres. The Water page's formatter would show `2`. Comparing Cassette ACTUAL to a Water-style string will fail even when the raw value is 2.
- A start fill of 100 percent leaves no room, and `#empty-days` becomes `0` rather than a day count (`assets/cassette-app.js`).
- URL query prefill (`parseCassettePrefillQuery` in `assets/cassette-calc.js`) can override the preset after load. This drive opens `/cassette.html` with no query.
- The size field commits on blur. This case uses the preset so the size is 18 L without typing.
