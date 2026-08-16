# DeviceCheckupTool

DeviceCheckupTool is a static-facing Device Checkup Tool backed by JSON data. The public site lets users choose a platform, choose a manufacturer, complete a Device Check, review scored results, copy review text, and print/save a Device Check Report. The editor runs through the Flask API in `app.py` so generic Device Check definitions can be maintained from the same project.

The architecture is intentionally preserved: static public pages, editor pages, shared JS panes/core modules, Flask API, Docker, JSON data, review/report flow, responsive CSS, status messages, and backup handling.

## Selection Flow

```text
Home
  -> Platform category
  -> Manufacturer
  -> Common Device Check page
  -> Device Check Review / Report
```

The active platform categories are loaded from `public/data/deviceTypes.json`:

- Windows
- macOS
- iPhone
- Android

Windows manufacturers:

- HP
- Dell
- Lenovo
- Acer
- ASUS
- Other

Android manufacturers:

- Samsung
- Google
- Motorola
- Other

macOS and iPhone currently each include Apple.

## Data Layout

```text
public/data/deviceTypes.json
public/data/checkups/windows/hp.json
public/data/checkups/windows/dell.json
public/data/checkups/windows/lenovo.json
public/data/checkups/windows/acer.json
public/data/checkups/windows/asus.json
public/data/checkups/windows/other.json
public/data/checkups/macos/apple.json
public/data/checkups/ios/apple.json
public/data/checkups/android/samsung.json
public/data/checkups/android/google.json
public/data/checkups/android/motorola.json
public/data/checkups/android/other.json
public/data/scoring.json
```

The files under `public/data/checkups/` use the generic Device Check schema. The table, review, report, editor, validation, backup flow, Device Score, and Device Status all read this schema.

## Device Check Schema

Each manufacturer file contains one Device Check definition:

```json
{
  "id": "windows-lenovo",
  "title": "Lenovo Windows Device Check",
  "description": "Generic device check for Lenovo Windows computers.",
  "categories": [
    {
      "id": "storage",
      "title": "Storage",
      "checks": [
        {
          "id": "storage_used",
          "label": "Storage Used",
          "type": "percentage",
          "unit": "%",
          "allowNA": false,
          "weight": 1,
          "rules": [
            { "min": 0, "max": 84, "score": 100 },
            {
              "min": 85,
              "max": 100,
              "score": 40,
              "issue": "Storage usage is high.",
              "recommendation": "Free up storage or move data to another drive."
            }
          ]
        }
      ]
    }
  ]
}
```

Supported check input types:

- `percentage`
- `number`
- `yes_no`
- `pass_fail`
- `condition`
- `text`

Checks may set `allowNA: true` when N/A should be available.

Individual check rules live inside each device JSON file. `public/data/scoring.json` defines only the final Device Status bands for the calculated 0-100 Device Score.

## Scoring

Each completed, applicable check receives a 0-100 score from its own JSON rules. Higher scores are better. Check `weight` defaults to `1`, text checks without rules are informational, and N/A or unanswered checks are excluded from both the numerator and denominator.

The overall Device Score is a weighted average of scored checks:

```text
sum(check score * check weight) / sum(check weight)
```

The final score is rounded to a whole number and matched against `minScore` and `maxScore` in `public/data/scoring.json`. The matched JSON object provides the Device Status `title`, status `message`, and visual `color`.

## Public Pages

All platforms use one generic category page:

```text
public/js/pages/categoryPage.js
```

All manufacturer selections use one common Device Check page:

```text
public/js/pages/checkupPage.js
```

No per-platform or per-manufacturer page modules are used.

## Review And Export

The Review page uses the same report model for on-screen review, Copy Review Text, and Print / Save PDF. It shows assessment details, Device Check title, Device Status, Device Score, the status message, completed checks grouped by category, entered values with units, individual check scores where applicable, matched-rule issue/recommendation text, and notes.

Copy Review Text writes plain text to the clipboard. Print / Save PDF uses the browser print flow; no extra PDF dependency is required.

## Editor

The editor is available at:

```text
/editor/
```

It preserves:

- Add/Edit mode
- Add Check / Remove Check actions
- Save Device Checkup
- status messages
- JSON persistence for Device Check definitions
- backup creation before overwrites
- responsive pane layout

The active editor API is:

```text
GET  /api/editor/device-types
GET  /api/editor/device-types/<platform-id>/<manufacturer-id>
POST /api/editor/device-types/<platform-id>/<manufacturer-id>
POST /api/editor/device-types
```

Compatibility aliases for the previous flat editor route remain in `app.py` to avoid breaking old bookmarks during the transition.

## Persistence

Persistent JSON is only for generic Device Check definitions and scoring configuration. Completed Device Checks, customer names, serial numbers, entered results, and generated reports are not saved to repository JSON files.

The browser review workflow remains session-scoped. Do not add a database or server-side storage for completed Device Check data in this phase.

## Backups

When the editor overwrites an existing JSON file, `app.py` creates a timestamped backup under:

```text
backups/checkups/<platform-id>/
```

Existing historical backup files from the copied project are left in place.

## Run Locally

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Then open:

```text
http://localhost:5000/
http://localhost:5000/editor/
```

## Static Public Test

The public Device Check workflow can run without the Flask write API:

```bash
cd public
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Editor writes require the Flask or Docker backend.

## Docker

```bash
docker compose up --build
```

The compose service/container name is `device-checkup-tool`.
