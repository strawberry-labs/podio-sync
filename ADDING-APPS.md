# Adding a New Podio App

## What You Need to Provide

For each new Podio app, provide the following:

### Required

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Human-readable app name | `Summer Programs` |
| **Slug** | URL-friendly identifier (lowercase, hyphens) | `summer-programs` |
| **App ID** | Podio app ID (numeric) | `17686740` |
| **App Token** | Podio app token | `a1b2c3d4e5f6...` |

### Optional (for webhook monitoring)

| Field | Description | Example |
|-------|-------------|---------|
| **Monitored Fields** | Field `external_id`s that trigger Basecamp sync on change | `['status', 'school', 'signup-deadline']` |
| **Monitored Field Labels** | Field display names to monitor (case-insensitive) | `['Sale Title', 'Location 1']` |
| **Label Contains Triggers** | Partial label matches that trigger sync | `['Create Basecamp Event']` |
| **Event Creation Trigger Field** | `external_id` of the field that triggers event creation | `create-basecamp-event` |
| **Event Creation Trigger Value** | Value that triggers event creation | `yes` |

> If you don't know the monitored fields yet, just provide the required fields. The app will still be accessible via the REST API — monitoring can be added later.

## Where to Find App ID and Token

1. Open the Podio app in your browser
2. Go to the app's **Settings** (wrench icon) → **Developer**
3. The **App ID** and **App Token** are displayed there

## How It Gets Added (3 steps)

### 1. Create the app config file

Create `src/config/apps/<slug>.config.ts`:

```typescript
import { PodioAppDefinition } from '../podio-apps.config';

export const summerProgramsApp: PodioAppDefinition = {
  name: 'Summer Programs',
  slug: 'summer-programs',
  monitoredFields: ['status', 'school'],
  // Optional:
  // monitoredFieldLabels: ['Sale Title'],
  // labelContainsTriggers: ['Create Basecamp Event'],
  // eventCreationTriggerField: 'create-basecamp-event',
  // eventCreationTriggerValue: 'yes',
};
```

### 2. Register in the barrel export

Add the import and entry in `src/config/apps/index.ts`:

```typescript
import { summerProgramsApp } from './summer-programs.config';

export const appDefinitions: PodioAppDefinition[] = [
  // ... existing apps
  summerProgramsApp,
];
```

### 3. Add environment variables

Add to `.env` (naming convention: slug uppercased, hyphens → underscores):

```
PODIO_APP_SUMMER_PROGRAMS_ID=17686740
PODIO_APP_SUMMER_PROGRAMS_TOKEN=a1b2c3d4e5f6...
```

## Env Var Naming Convention

The slug is automatically converted to the env var prefix:

| Slug | Env Var Prefix |
|------|---------------|
| `camp-sales` | `PODIO_APP_CAMP_SALES_` |
| `ia-sales` | `PODIO_APP_IA_SALES_` |
| `summer-programs` | `PODIO_APP_SUMMER_PROGRAMS_` |

Each app needs `{PREFIX}ID` and `{PREFIX}TOKEN`.

## API Access

Once added, the app is available at these endpoints:

### Read-only (works with both read-only and full-access API keys)

- `GET /api/podio/<slug>/items/<itemId>` — full item details
- `GET /api/podio/<slug>/items/<itemId>/values` — field values only
- `GET /api/podio/<slug>/items/<itemId>/revisions/<from>/<to>` — revision diff

### Write (requires full-access API key)

- `PUT /api/podio/<slug>/items/<itemId>` — update item fields
- `PUT /api/podio/<slug>/items/<itemId>/fields/<fieldId>` — update single field
- `POST /api/podio/<slug>/items/<itemId>/comments` — add comment

### Webhooks

- `POST /webhook/<slug>` — receives Podio webhook events (register this URL in Podio app settings)
