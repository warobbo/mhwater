# Redirects

A visitor who opens the old motorhome water host is sent to the matching Water hub URL. Files that exist on this host, including `/assets/calc.js`, are downloaded instead of redirected.

## Sub-features

- `redirect-home` sends `/` and `/index.html` to the hub Water page.
- `redirect-tools` sends each known tool or guide path to the same file name on the hub.
- `redirect-unknown` sends any other path that is not a real file to the hub Water page, and keeps the query string.
- `redirect-file` serves an existing file, such as `/assets/calc.js` and `/robots.txt`, as HTTP 200.

## How to get to it (user POV)

- Open `https://motorhomewater.co.uk/`.
- Open `https://mhwater.onrender.com/`.
- Open a tool path on either host, for example `https://motorhomewater.co.uk/gas.html`.
- Open an unknown path, for example `https://motorhomewater.co.uk/not-a-real-page`.
- Open a file that is in the repo, for example `https://motorhomewater.co.uk/assets/calc.js`.

The browser then shows the hub page, or the file. This repo has no calculator screen of its own.

## Driving it with mhwater-verify

Preconditions:

- `launch.mjs` and `doctor.mjs` have succeeded for this run.
- Live checks are read-only. Do not post to the production hosts.

- **Local map.** Run `.cursor/skills/verify-mhwater/scripts/drive.mjs redirects`. For each path below, the publish server returns 301 and `Location` is the hub URL with no extra path segments except where the table names a file. Query strings are appended.

INPUT / EXPECTED / ACTUAL for the redirect table. These are status and `Location` values from `_redirects`, not calculator results. ACTUAL is `local` and `live` in `evidence/redirects.json`.

| INPUT | EXPECTED status | EXPECTED Location |
| --- | --- | --- |
| `GET /` | 301 | `https://motorhometools.co.uk/water/` |
| `GET /index.html` | 301 | `https://motorhometools.co.uk/water/` |
| `GET /gas.html` | 301 | `https://motorhometools.co.uk/water/gas.html` |
| `GET /tanks.html` | 301 | `https://motorhometools.co.uk/water/tanks.html` |
| `GET /cassette.html` | 301 | `https://motorhometools.co.uk/water/cassette.html` |
| `GET /bottles.html` | 301 | `https://motorhometools.co.uk/water/bottles.html` |
| `GET /hotwater.html` | 301 | `https://motorhometools.co.uk/water/hotwater.html` |
| `GET /winterising.html` | 301 | `https://motorhometools.co.uk/water/winterising.html` |
| `GET /topup.html` | 301 | `https://motorhometools.co.uk/water/topup.html` |
| `GET /not-a-real-page-7fef` | 301 | `https://motorhometools.co.uk/water/` |
| `GET /gas.html?adults=2` on the live host | 301 | `https://motorhometools.co.uk/water/gas.html?adults=2` |
| `GET /not-a-real-page-7fef?x=1` on the live host | 301 | `https://motorhometools.co.uk/water/?x=1` |
| `GET /assets/calc.js` | 200 | no `Location` header |

- **Live hosts.** The same command also requests `https://motorhomewater.co.uk/`, `https://mhwater.onrender.com/`, and the gas and unknown examples on `https://motorhomewater.co.uk`. ACTUAL status and `Location` are the `live` array in `evidence/redirects.json`. `matchesCheckout` records whether the deployed `/assets/calc.js` body equals this working tree. A mismatch means production is not this commit; it does not by itself change the local UI drive, which uses the working tree.

Authoring run `2026-10-12T02-34-18-261Z` recorded every local and live row as `pass: true`. Live `https://motorhomewater.co.uk/assets/calc.js` was HTTP 200 and `matchesCheckout` was true.

## Gotchas

- Adding `index.html` or any other page file at the repo root makes Render return 200 for that path and skip the redirect. `tests/redirects.test.js` and `tests/seo.test.js` forbid those files. Doctor fails if they exist.
- The catch-all does not preserve the old path. `/not-a-real-page` lands on the hub Water page, not on a hub path of the same name.
- `/assets/*` will keep returning 200 while those files stay in the repo. That is the legacy JavaScript, not the hub UI.
- The local publish server is a stand-in that reads `_redirects`. Doctor also runs `tests/redirects.test.js`, which checks `render.yaml` against the same destinations. Production is still a separate check in `drive redirects`.
- Do not point a drive at a publish server you did not start. Launch will not replace one that is already recorded.
