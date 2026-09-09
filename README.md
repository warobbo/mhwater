# Water Tools (mhwater)

A small, mobile-friendly hub of **motorhome water and gas calculators** for UK and EU users.

Later public home: **motorhomewater.co.uk** (water and gas together).

Live (after deploy): [mhwater.onrender.com](https://mhwater.onrender.com)

## Slice 1 — Water usage

Set people, trip length and habits to see:

- litres of **fresh water** per day and for the whole trip
- litres of **grey water** per day and for the trip
- a breakdown by showers, washing up, laundry, drinking/cooking, and cassette flushes
- a **water weight** line (1 litre ≈ 1 kg)
- a rough “days until the fresh tank is empty” note if you type a tank size

Presets: Weekend (2 people), Family week, Light full-time, and Reset to defaults.

## Slice 2 — Gas / LPG usage

Set trip length, cooking, heating and a UK bottle size to see:

- **kilograms of LPG / gas** for the trip and per day (butane by default, or propane)
- how many **days a bottle lasts**
- how many **bottles** to take (rounded up)
- a breakdown by cooking, heating, fridge-on-gas, and optional hot water

Presets: Weekend summer, Winter week, Full-time light, and Reset to defaults.

Trip days and people **start from the Water page** if you have already used it. After that, Gas keeps its own numbers.

UK bottle picker follows Calor leisure sizes: **butane** 4.5 / 7 / 15 kg (default) and **propane** 3.9 / 6 / 13 kg. You can type another size. Winter week uses propane; the other presets stay on butane.

Planning rates are documented in `assets/gas-calc.js` (heater, hob, 3-way fridge, boiler). They are typical leisure-vehicle figures, not a safety certificate.

## Slice 3 — Holding tank fill / empty planner

Uses the **daily fresh and grey figures from Water**, plus tank sizes, to show:

- days until **fresh runs dry**
- days until **grey is full**
- days until the **cassette or black tank** needs emptying
- which tank **ends the stretch first**
- how many extra **fills / empties** a trip of X days would need

Optional starting levels (how full each tank is now). Fresh tank size is shared with the Water page.

Presets: Weekend wild (small tanks), Typical UK van, Family week, and Reset to defaults.

Most UK leisure vans use a **cassette** of about 15–20 L. A fixed black tank is supported too.

## Slice 4 — Cassette / toilet empty planner

A phone-first page for **empty stops only** (not a full fresh/grey planner — that stays on Tanks).

Set people, trip length, cassette or fixed black tank size, flushes and start fill to see:

- **days until an empty** is needed (from the current fill)
- litres of waste **per day** and **for the trip**
- how many **empties** that trip needs (including one at the end)

Presets: Weekend couple, Family week, Solo wild camp, and Reset to defaults.

People, days and flush litres **start from the Water page** if you have already used it. Cassette size and start fill start from Tanks if those are saved. After that, Cassette keeps its own numbers.

## Later modules (nav stubs only)

Primary nav: **Water** | **Gas** | **Tanks** | **Cassette**

Under **More tools**:

- Water weight — already on the Water page
- Gas bottle / cylinder picker (a later, fuller picker — simple sizes are on the Gas page)
- Hot water (gas vs electric)
- Winterising volume
- Top-up / Aquaroll planner

Those pages say “coming soon”. They are not built yet.

The site is a static front-end: no backend, no accounts, and no APIs. It is meant to deploy on Render as a static site.

## How to use

**Water**

1. Open Water usage and pick a preset, or keep the defaults.
2. Edit people, days, showers and kitchen habits.
3. Totals update as you type. Refresh: the numbers stay on this device.

**Gas**

1. Open Gas (top menu). Pick a preset, or keep the defaults.
2. Edit days, cooking, heating, and whether the fridge or hot water run on gas.
3. Pick a bottle size. See kilograms, days the bottle lasts, and bottles to take.

**Tanks**

1. Set habits on Water first (or keep those defaults).
2. Open Tanks. Pick a preset, or type your fresh, grey and cassette sizes.
3. See which tank ends a wild-camping stretch first, and how many fills or empties an X-day trip needs.

**Cassette**

1. Open Cassette (top menu). Pick a preset, or keep the defaults.
2. Set people, days, cassette or black-tank size, and flush habits.
3. See days until empty, litres of waste, and how many empties the trip needs.

Numbers are a **planning estimate only**.

On a phone, hold the screen upright. A sideways phone shows a rotate message instead of a landscape layout.

## Run locally

No build step and no npm install.

From the repo root:

```bash
python3 -m http.server 8080
```

Then open [http://127.0.0.1:8080/](http://127.0.0.1:8080/).

You can also open the HTML files directly in a browser. A local server is the more reliable option.

To check the maths:

```bash
node tests/calc.test.js
node tests/gas-calc.test.js
node tests/tank-calc.test.js
node tests/cassette-calc.test.js
node tests/ui.test.js
```

## Deploy on Render (static site)

1. Push this repository to GitHub.
2. In the Render dashboard, choose **New → Static Site**.
3. Connect the repo and branch (`main` once merged).
4. Settings:
   - **Build Command:** leave empty
   - **Publish Directory:** `.`
5. Optional environment variable: `SKIP_INSTALL_DEPS=true` (there are no Node dependencies to install).
6. Deploy.

A `render.yaml` Blueprint is included with the same static publish path. After you have a live domain, add that host to `sitemap.xml` (`<loc>`) and optionally a `Sitemap:` line in `robots.txt`. Do not use a placeholder domain.

## Persistence

All Water Tools slices share one browser profile:

| Item | Value |
| --- | --- |
| **localStorage key** | `watertools.systemProfile` |
| **Current version** | `1` |

Water usage reads and writes `waterUsage`. Gas usage reads and writes `gasUsage` on the **same object**. The tank planner reads and writes `tankPlan` on the **same object**. The cassette empty planner reads and writes `cassettePlan` on the **same object**. Later slices should add sibling keys instead of creating new localStorage keys. Bump `version` only if a breaking migration is required. The loader already preserves unknown sibling keys.

```json
{
  "version": 1,
  "waterUsage": {
    "adults": 2,
    "children": 0,
    "tripDays": 2,
    "showersPerPersonPerDay": 0.5,
    "showerStyle": "short",
    "showerMinutes": 1.5,
    "showerLitres": 6,
    "washUpLitresPerDay": 5,
    "laundryEnabled": false,
    "laundryLitresPerLoad": 15,
    "laundryLoadsPerTrip": 0,
    "drinkCookLitresPerPersonPerDay": 2.5,
    "cassetteEnabled": true,
    "cassetteFlushesPerPersonPerDay": 5,
    "cassetteLitresPerFlush": 0.25,
    "freshTankLitres": 100,
    "activePreset": "defaults"
  },
  "gasUsage": {
    "adults": 2,
    "children": 0,
    "tripDays": 2,
    "season": "summer",
    "mealsPerDay": 2,
    "cookingStyle": "normal",
    "heatingLevel": "off",
    "heatingHours": 0,
    "fridgeGasEnabled": false,
    "fridgeHoursPerDay": 24,
    "boilerEnabled": false,
    "boilerLevel": "normal",
    "boilerHours": 1.5,
    "gasType": "butane",
    "bottleId": "butane7",
    "bottleKg": 7,
    "activePreset": "defaults"
  },
  "tankPlan": {
    "tripDays": 2,
    "freshTankLitres": 100,
    "greyTankLitres": 90,
    "blackKind": "cassette",
    "blackTankLitres": 18,
    "freshStartPercent": 100,
    "greyStartPercent": 0,
    "blackStartPercent": 0,
    "activePreset": "defaults"
  },
  "cassettePlan": {
    "adults": 2,
    "children": 0,
    "tripDays": 2,
    "blackKind": "cassette",
    "blackTankLitres": 18,
    "flushesPerPersonPerDay": 5,
    "litresPerFlush": 0.25,
    "startPercent": 0,
    "activePreset": "defaults"
  }
}
```

## Out of scope (this slice)

A standalone bottle shopper, hot-water comparison, winterising, Aquaroll planner, accounts, and affiliates.

## Disclaimer

These calculators are a planning estimate only. They are not a design, a payload calculation, a safety certificate, or a guarantee that tanks or bottles will last. Use gas only with ventilation. Have gas work done by a qualified fitter. Check your van’s tank sizes, bottle fittings and weight limits, and dispose of grey and cassette waste at proper points.
