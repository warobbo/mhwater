# Winterising

Winterising volume is a coming-soon page. It does not compute a lay-up volume.

## Sub-features

- `winterising-soon` shows the coming-soon heading and the not-built-yet paragraph.
- `winterising-redirect` on the mhwater host sends `/winterising.html` to the hub copy.

## How to get to it (user POV)

- Open `https://motorhomewater.co.uk/winterising.html`, which redirects to `https://motorhometools.co.uk/water/winterising.html`.
- On a Water hub tool, open **More tools** and choose **Winterising volume**.

## Driving it with mhwater-verify

Preconditions:

- Doctor has passed.

- **Open the page.** Run `.cursor/skills/verify-mhwater/scripts/drive.mjs coming-soon`. The winterising entry requests `/winterising.html` on the UI port.

### INPUT

Open `/winterising.html`. No fields. No module in `assets/`.

### EXPECTED

No formula in this repo, so there is no derived number. The hub HTML says:

- `h1`: Winterising volume
- `h2`: Coming soon
- Paragraph: This page will help with a winter lay-up volume check. It is not built yet.

### ACTUAL

`evidence/coming-soon.json` entry for `winterising.html`.

The redirect is the `/winterising.html` row in [redirects](./redirects.md).

## Gotchas

- The Gas Winter preset is a heating and propane estimate, not a winterising volume. Do not report Gas kilograms as this page's result.
- The page says it is not a substitute for the boiler or van handbook. There is still no calculator behind that sentence.
