# Hot water

Hot water (gas versus electric) is a coming-soon page. It does not compare fuels and it does not read the Water shower litres yet.

## Sub-features

- `hotwater-soon` shows the coming-soon heading and the not-built-yet paragraph.
- `hotwater-redirect` on the mhwater host sends `/hotwater.html` to the hub copy.

## How to get to it (user POV)

- Open `https://motorhomewater.co.uk/hotwater.html`, which redirects to `https://motorhometools.co.uk/water/hotwater.html`.
- On a Water hub tool, open **More tools** and choose **Hot water (gas vs electric)**.

## Driving it with mhwater-verify

Preconditions:

- Doctor has passed.

- **Open the page.** Run `.cursor/skills/verify-mhwater/scripts/drive.mjs coming-soon`. The hot water entry requests `/hotwater.html` on the UI port.

### INPUT

Open `/hotwater.html`. No fields. No module in `assets/`.

### EXPECTED

No formula in this repo, so there is no derived number. The hub HTML says:

- `h1`: Hot water (gas vs electric)
- `h2`: Coming soon
- Paragraph: This page will show a simple gas-versus-electric choice for showers and washing up. It is not built yet.

### ACTUAL

`evidence/coming-soon.json` entry for `hotwater.html`.

The redirect is the `/hotwater.html` row in [redirects](./redirects.md).

## Gotchas

- Gas already has a hot-water burner term (`BOILER_KG_PER_HOUR` in `assets/gas-calc.js`). That is the Gas page's boiler row, not this coming-soon page.
- Do not invent a gas-versus-electric split. The page says it is not built.
