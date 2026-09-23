# Water Tools (mhwater)

A small, mobile-friendly hub of **motorhome water and gas calculators** for UK and EU users.

**Live domains redirect to the hub.** `https://motorhomewater.co.uk` and `https://mhwater.onrender.com` permanently redirect (HTTP 301) to [https://motorhometools.co.uk/water/](https://motorhometools.co.uk/water/). The calculator source in this repo is no longer what those hosts serve. See [Redirects](#redirects-to-the-hub).

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

## Redirects to the hub

Both public hosts are this Render static service (`mhwater`):

- `https://motorhomewater.co.uk`
- `https://mhwater.onrender.com`

`render.yaml` defines Render **redirect** rules. On a static site that action is **HTTP 301**. There is no separate status-code field. Rules apply to every host on the service, including the custom domain and the `onrender.com` URL.

| Request path | 301 Location |
| --- | --- |
| `/` and `/index.html` | `https://motorhometools.co.uk/water/` |
| `/gas.html` | `https://motorhometools.co.uk/water/gas.html` |
| `/tanks.html` | `https://motorhometools.co.uk/water/tanks.html` |
| `/cassette.html` | `https://motorhometools.co.uk/water/cassette.html` |
| `/bottles.html` | `https://motorhometools.co.uk/water/bottles.html` |
| `/hotwater.html` | `https://motorhometools.co.uk/water/hotwater.html` |
| `/winterising.html` | `https://motorhometools.co.uk/water/winterising.html` |
| `/topup.html` | `https://motorhometools.co.uk/water/topup.html` |
| any other path (`/*`) | `https://motorhometools.co.uk/water/` |

Specific paths are listed above the catch-all so they win. Those hub URLs were checked against the live water tree (each calculator page returns 200; `/water/index.html` already 301s to `/water/`).

Render does **not** apply a redirect when a file exists at the same path. It serves the file with HTTP 200. That is why `/index.html` previously stayed 200 even with a redirect rule. This service therefore publishes `public/`, which has no HTML, assets, `robots.txt`, or `sitemap.xml`. The build command also deletes repo-root files before publish, so a service still set to publish `.` does not keep serving the old pages.

`/.gitkeep` is the only published file. A request for that exact path can return 200. Every normal URL is covered by a redirect rule.

Hash fragments are not sent to the server. A browser that opens `/#weight` usually keeps `#weight` after the 301, which lands on the hub water page’s weight section. Gas and Cassette share links put the trip in the query string (`?adults=2&tripDays=3` and similar). The redirect source is only the path. After deploy, confirm the query string is still on `Location`:

```bash
curl -sI https://motorhomewater.co.uk/
curl -sI https://motorhomewater.co.uk/gas.html
curl -sI https://motorhomewater.co.uk/tanks.html
curl -sI https://motorhomewater.co.uk/cassette.html
curl -sI "https://motorhomewater.co.uk/gas.html?adults=2&tripDays=3"
curl -sI https://mhwater.onrender.com/
```

Expect `301` and a `Location` of the hub URL in the table (plus the original query string, if Render appends it). HTTP on these hosts is already redirected to HTTPS by Render before these rules run.

This repo does not change `motorhometools.co.uk`.

## Deploy on Render (static site)

1. Push this repository to GitHub.
2. The existing `mhwater` static site auto-deploys from `main` using `render.yaml`.
3. Settings that must match the Blueprint:
   - **Build Command:** `mkdir -p public && find . -mindepth 1 -maxdepth 1 -name public -prune -o -name .git -prune -o -exec rm -rf {} +`
   - **Publish Directory:** `public`
   - **Redirects:** the routes in `render.yaml` (specific paths first, then `/*`)
4. Environment variable: `SKIP_INSTALL_DEPS=true` (there are no Node dependencies to install).

If a dashboard override still publishes `.` and still has the old pages on disk, redirect rules will not run for those paths. The build command above is what clears them. Do not add an `index.html` under `public/`; that file would be served at `/` instead of the 301.

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
