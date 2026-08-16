# Device Checkup Tool Public App

This is the static public side of DeviceCheckupTool.

The public home page loads platform categories dynamically from:

```text
data/deviceTypes.json
```

The current top-level categories are:

- Windows
- macOS
- iPhone
- Android

Selecting a category opens the generic category page:

```text
index.html?page=category&category=<platform-id>
```

Selecting a manufacturer opens the common Device Check page:

```text
index.html?page=checkup&category=<platform-id>&device=<manufacturer-id>
```

All manufacturer selections use:

```text
js/pages/checkupPage.js
```

Individual Device Check definitions live in:

```text
data/checkups/<platform-id>/<manufacturer-id>.json
```

The current JSON files are practical generic definitions using the Device Check schema. Each check stores its own scoring rules, and `data/scoring.json` maps the final 0-100 Device Score to a Device Status using JSON-defined `color`, `minScore`, `maxScore`, `message`, and `title` fields.

Each Device Check definition uses:

```text
id
title
description
categories
```

Each category contains:

```text
id
title
checks
```

Each check can use:

```text
id
label
type
unit
allowNA
weight
rules
```

Supported check types are `percentage`, `number`, `yes_no`, `pass_fail`, `condition`, and `text`. Rule `issue` and `recommendation` text belongs with the individual check rule.

Scoring excludes N/A and unanswered checks from both the numerator and denominator. Text checks are informational unless rules are defined for them.

The review/report flow remains browser-based and session-scoped. Copy Review Text outputs plain text, Print / Save PDF uses the browser print flow, and generated reports or completed customer/device results are not persisted by the public app or Flask API.
