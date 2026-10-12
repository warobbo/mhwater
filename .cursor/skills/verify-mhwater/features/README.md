# mhwater verification map

This directory is the maintained source for verifying what a visitor can do with this repo. Read this index, then use the matching feature file.

This checkout publishes the `mhwater` redirect host (`https://motorhomewater.co.uk`, `https://mhwater.onrender.com`). Calculator HTML is not in the repo. The live pages are on [https://motorhometools.co.uk/water/](https://motorhometools.co.uk/water/). The local publish server serves `public/` from the allowlist. The live service still publishes the repo root until its Build Command and Publish Directory change. The drives below open a temp copy of that hub shell served with this checkout's `assets/`, so the click runs the JavaScript in the working tree. See the skill's "What this checkout serves" section.

Update this feature map in the same PR whenever a build changes pages or tools.

A weekly maintain pass runs on Mondays, as part of Freddie the Font2's routine. It edits only `.cursor/skills/verify-mhwater/`, opens at most one PR through the review loop, and stays quiet unless blocked.

## Baseline preconditions

- Run `.cursor/skills/verify-mhwater/scripts/launch.mjs` and then `.cursor/skills/verify-mhwater/scripts/doctor.mjs`. Require `worthDriving: true` in `evidence/doctor.json`.
- Use the ports in `/tmp/mhwater-verify/state.json`. Do not guess a port and do not drive a server you did not launch.
- Calculator drives need the UI port. Redirect drives need the publish port. Live redirect checks are read-only against the shared production hosts.
- Chrome is `/usr/bin/google-chrome`. Each calculator drive gets a new user-data directory.
- Run `expect.mjs` only to read derived EXPECTED strings. It is not the proof.

## Driving conventions

- Start every recipe from the baseline. A fresh Chrome profile means Water habits are `createDefaultUsage()` in `assets/defaults.js` until a preset is clicked.
- Click preset buttons with the `aria-label` in the feature file. That label is `label (sublabel)` from the defaults module.
- Keep the viewport at 1280×900. A short landscape window shows `#rotate-gate` and sets the page `inert` (`assets/ui.js`).
- Record the feature id and the entry point in the evidence file. A skipped entry point is not verified by a different one.

## Proof and skip reporting

- Capture the action and the resulting state. Calculator evidence includes the before text, the after text, both screenshots, and the ACTUAL strings.
- Redirect proof is the status and `Location` header, locally and on the live hosts.
- If a path cannot be reached, write the command and the unmet precondition. Do not mark it passed through another URL.

## Feature entry contract

Each feature file starts with an H1 and one paragraph, then these H2 sections in order: `Sub-features`, `How to get to it (user POV)`, `Driving it with mhwater-verify`, `Gotchas`.

Calculator files include INPUT, EXPECTED, and ACTUAL. EXPECTED is derived from the module named in the file. ACTUAL is what the drive read from the page, stored under `evidence/`. There is no separate numeric ACTUAL to invent if the drive has not been run.

## Features

- [Redirects](./redirects.md) — what this host answers for a visitor who still uses the old URLs.
- [Water usage](./water-usage.md) — fresh and grey litres on the Water page.
- [Gas / LPG](./gas.md) — kilograms, bottle days, and bottles for the trip.
- [Holding tanks](./tanks.md) — which tank ends the stretch.
- [Cassette](./cassette.md) — days until the cassette needs emptying.
- [Gas bottle picker](./bottles.md) — coming-soon page, no formula.
- [Hot water](./hot-water.md) — coming-soon page, no formula.
- [Winterising](./winterising.md) — coming-soon page, no formula.
- [Top-up / Aquaroll](./top-up.md) — coming-soon page, no formula.
