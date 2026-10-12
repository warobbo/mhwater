# Water usage

The Water page turns people, trip length, showers, washing up, laundry, drinking, and cassette flushes into fresh litres, grey litres, and water weight.

## Sub-features

- `water-preset-weekend` applies the Weekend preset and shows trip and daily totals.
- `water-grey` leaves drinking and cassette flushes out of grey water.
- `water-tank-days` shows how long a full fresh tank lasts at the daily rate.
- `water-weight` treats 1 litre as 1 kg.

## How to get to it (user POV)

- Open `https://motorhomewater.co.uk/` and follow the redirect to `https://motorhometools.co.uk/water/`.
- Open `https://motorhometools.co.uk/water/` directly.
- On the hub, choose **Water** in the bar labelled Main tools.
- On the page, choose **Weekend (2 people · 2 days)** under Start from a preset. The button's accessible name comes from `assets/defaults.js` via `assets/app.js`.

The HTML for this page is not served by mhwater. The drive uses the temp UI server, which is the same shell with this checkout's scripts.

## Driving it with mhwater-verify

Preconditions:

- Doctor reports the UI port healthy and `assets/calc.js` matches the checkout.
- Chrome profile is new, so no saved `watertools.systemProfile` is present.
- Viewport is 1280×900 and `#rotate-gate` is hidden (`aria-hidden="true"` on the gate).

- **Weekend preset.** Run `.cursor/skills/verify-mhwater/scripts/drive.mjs water`. That clicks `button[aria-label="Weekend (2 people · 2 days)"]` and reads the result nodes.

### INPUT

The Weekend preset in `assets/defaults.js` (`PRESETS.weekend.usage`):

- adults 2, children 0, tripDays 2
- showersPerPersonPerDay 0.5, showerStyle short, showerMinutes 1.5, showerLitres 6
- washUpLitresPerDay 5
- laundryEnabled false
- drinkCookLitresPerPersonPerDay 2.5
- cassetteEnabled true, cassetteFlushesPerPersonPerDay 4, cassetteLitresPerFlush 0.25
- freshTankLitres 100

### EXPECTED

Derived from `calcWater` in `assets/calc.js`. Children use `CHILD_FACTOR` 0.7 for showers and drinking. Cassette flushes use headcount (`adults + children`), not the 0.7 factor. Grey water is fresh water minus drinking and cassette. Laundry is off, so it adds 0. Display formatting is `formatLitres` and `formatDays` in `assets/app.js` (en-GB, 0 fraction digits at 100 or above, otherwise at most 1).

- peopleUnits = 2 + 0 × 0.7 = 2
- heads = 2
- showerDaily = 2 × 0.5 × 6 = 6
- washDaily = 5
- laundryDaily = 0
- drinkDaily = 2 × 2.5 = 5
- cassetteDaily = 2 × 4 × 0.25 = 2
- freshDaily = 6 + 5 + 0 + 5 + 2 = 18
- freshTrip = 18 × 2 = 36
- greyDaily = 18 − 5 − 2 = 11
- greyTrip = 11 × 2 = 22
- daysUntilEmpty = 100 / 18 = 5.555… which `formatDays` shows as 5.6

| Node | EXPECTED text |
| --- | --- |
| `#total-trip` | 36 |
| `#total-daily` | 18 |
| `#grey-trip` | 22 |
| `#grey-daily` | 11 |
| `#weight-note` | About 36 kg if you carry the whole trip’s fresh water (1 litre = 1 kg). |
| `#tank-note` | A full 100 L tank is about 100 kg. At this rate it lasts about 5.6 days before you need a top-up. |

`expect.mjs water` prints the same display strings and sets `moduleAgrees` only when this arithmetic matches `calcWater`.

### ACTUAL

The drive writes the text it read into `evidence/water.json` under `actual`, plus `water-before.png`, `water-after.png`, and `water.aria.txt`. ACTUAL matches EXPECTED only when `pass` is true. Do not copy a number from memory if that file is missing.

## Gotchas

- Cassette litres use headcount. A child is a full flush, and 0.7 of an adult for showers and drinking. Mixing those factors will not match the page.
- Grey water excludes drinking and cassette flushes. The grey note in `assets/app.js` says shower, washing up, and laundry.
- The Weekend preset uses 4 flushes per person. The untouched default profile uses 5. A drive that forgets the click is not this case.
- `#tank-note` stays empty when fresh tank litres are 0 (`hasTank` is false).
- Typing in a number field can hold a partial value (`assets/ui.js`). This case uses the preset button so the committed preset is what is on screen.
- The result is stored only in `localStorage` on the throwaway profile. There is no account and no server row.
- A change to `assets/calc.js` shows up on the UI port. It does not change `https://motorhometools.co.uk/water/` until the hub repo is updated.
