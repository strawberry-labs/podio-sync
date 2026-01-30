# Eco Podio Webhook

A NestJS application that handles Podio webhooks and synchronizes data with Basecamp for Ecoventure event management.

## Overview

This service acts as a bridge between Podio (sales pipeline) and Basecamp (event management). It listens for changes in Podio apps via webhooks and triggers appropriate actions on Basecamp.

```mermaid
flowchart LR
    subgraph Podio
        A[Camp Sales]
        B[IA Sales]
        C[Overseas Camp Sales]
        D[Opportunities]
    end

    subgraph This Service
        E[Webhook Controller]
        F[Podio Service]
        G[Basecamp Service]
    end

    subgraph Basecamp
        H[Events API]
    end

    A -->|item.update| E
    B -->|item.update| E
    C -->|item.update| E
    D -->|item.update| E

    E --> F
    F -->|Get Revision Diff| Podio
    E --> G
    G -->|Create/Update Event| H
```

## Architecture

### Module Structure

```mermaid
graph TB
    subgraph AppModule
        AC[AppController]
    end

    subgraph WebhooksModule
        WC[WebhooksController]
    end

    subgraph PodioModule
        PS[PodioService]
        PS -->|Token Storage| TM[Token Map]
        PS -->|Scheduled| TR[Token Refresh]
    end

    subgraph BasecampModule
        BS[BasecampService]
    end

    subgraph ConfigModule
        CM[Environment Config]
        PAC[Podio Apps Config]
    end

    WC --> PS
    WC --> BS
    AC --> PS
    PS --> CM
    PS --> PAC
    BS --> CM
```

### Project Structure

```
src/
├── config/
│   └── podio-apps.config.ts    # Podio app configurations
├── podio/
│   ├── podio.module.ts
│   └── podio.service.ts        # OAuth, API calls, token management
├── basecamp/
│   ├── basecamp.module.ts
│   └── basecamp.service.ts     # Basecamp API integration
├── webhooks/
│   ├── webhooks.module.ts
│   └── webhooks.controller.ts  # Webhook endpoints
├── app.module.ts
├── app.controller.ts           # Health check & status
└── main.ts
```

## Webhook Flow

### Item Update Flow

```mermaid
sequenceDiagram
    participant P as Podio
    participant W as Webhook Controller
    participant PS as Podio Service
    participant BS as Basecamp Service
    participant B as Basecamp API

    P->>W: POST /webhook/{app-slug}
    Note over W: type: item.update<br/>item_id, revision_id

    W->>PS: getRevisionDiff(itemId, rev-1, rev)
    PS->>P: GET /item/{id}/revision/{from}/{to}
    P-->>PS: Field changes array
    PS-->>W: Diff result

    alt Monitored Fields Changed
        W->>BS: notifyFieldChanges(itemId, changes)
        BS->>B: POST /events/update-from-podio
        B-->>BS: Success
        BS-->>W: Result
    end

    alt Event Creation Triggered
        W->>PS: getItem(itemId)
        PS->>P: GET /item/{id}
        P-->>PS: Full item data
        PS-->>W: Item data
        W->>BS: createEvent(payload)
        BS->>B: POST /events/create-from-podio
        B-->>BS: Basecamp URL
        BS-->>W: Result
    end

    W-->>P: 200 OK
```

### Webhook Verification Flow

```mermaid
sequenceDiagram
    participant P as Podio
    participant W as Webhook Controller
    participant PS as Podio Service

    Note over P: Webhook Created in Podio

    P->>W: POST /webhook/{app-slug}
    Note over W: type: hook.verify<br/>hook_id, code

    W->>PS: verifyWebhook(hookId, code)
    PS->>P: POST /hook/{hookId}/verify/validate
    P-->>PS: Success
    PS-->>W: Verified

    W-->>P: 200 OK

    Note over P: Webhook Now Active
```

### OAuth Token Refresh

```mermaid
sequenceDiagram
    participant C as Cron (Every 30min)
    participant PS as Podio Service
    participant P as Podio OAuth

    C->>PS: handleTokenRefresh()

    loop For Each App
        alt Token Expired
            PS->>P: POST /oauth/token/v2<br/>grant_type: refresh_token
            P-->>PS: New access_token, refresh_token
            PS->>PS: Update token storage
        end
    end
```

## Webhook Endpoints

| Endpoint | App | Description |
|----------|-----|-------------|
| `POST /webhook/camp-sales` | Camp Sales | Local residential camps |
| `POST /webhook/ia-sales` | IA Sales | International Awards sales |
| `POST /webhook/overseas-camp-sales` | Overseas Camp Sales | International camps |
| `POST /webhook/opportunities` | Opportunities | Sales opportunities |

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Podio API Credentials (shared)
PODIO_CLIENT_ID=your_client_id
PODIO_CLIENT_SECRET=your_client_secret

# Podio App Credentials - Camp Sales
PODIO_APP_CAMP_SALES_ID=your_app_id
PODIO_APP_CAMP_SALES_TOKEN=your_app_token

# Podio App Credentials - IA Sales
PODIO_APP_IA_SALES_ID=your_app_id
PODIO_APP_IA_SALES_TOKEN=your_app_token

# Podio App Credentials - Overseas Camp Sales
PODIO_APP_OVERSEAS_CAMP_SALES_ID=your_app_id
PODIO_APP_OVERSEAS_CAMP_SALES_TOKEN=your_app_token

# Podio App Credentials - Opportunities
PODIO_APP_OPPORTUNITIES_ID=your_app_id
PODIO_APP_OPPORTUNITIES_TOKEN=your_app_token

# Basecamp API
BASECAMP_API_URL=https://events.ecoventureme.com/api

# Server
PORT=3001
```

### Monitored Fields

Each app has configured fields that trigger Basecamp sync when changed. Edit `src/config/podio-apps.config.ts`:

```typescript
{
  name: 'Camp Sales',
  slug: 'camp-sales',
  appId: process.env.PODIO_APP_CAMP_SALES_ID,
  appToken: process.env.PODIO_APP_CAMP_SALES_TOKEN,
  monitoredFields: [
    'registration-end-date',
    'event-dates',
    'teacher',
    'additional-school-charge',
  ],
  eventCreationTriggerField: 'create-on-basecamp',
  eventCreationTriggerValue: 'yes',
}
```

## Adding a New Podio App

```mermaid
flowchart TD
    A[1. Get App Credentials] --> B[2. Add to .env]
    B --> C[3. Add Config in podio-apps.config.ts]
    C --> D[4. Register Webhook in Podio]
    D --> E[5. Webhook Auto-Verifies]
    E --> F[App Ready]

    style A fill:#e1f5fe
    style F fill:#c8e6c9
```

### Steps:

1. **Get App Credentials**
   - Go to your Podio app → Settings → Developer
   - Copy the App ID and App Token

2. **Add to `.env`**
   ```bash
   PODIO_APP_NEW_APP_ID=12345
   PODIO_APP_NEW_APP_TOKEN=abc123
   ```

3. **Add Config** in `src/config/podio-apps.config.ts`:
   ```typescript
   {
     name: 'New App',
     slug: 'new-app',
     appId: process.env.PODIO_APP_NEW_APP_ID || '',
     appToken: process.env.PODIO_APP_NEW_APP_TOKEN || '',
     monitoredFields: ['field-1', 'field-2'],
   }
   ```

4. **Register Webhook in Podio**
   - Go to app → Settings → Developer → Add Webhook
   - URL: `https://your-domain.com/webhook/new-app`
   - Event: `item.update`

5. **Auto-Verification**
   - The service automatically handles `hook.verify` requests

## Setup & Development

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
```

### Running

```bash
# Development (with hot reload)
pnpm run start:dev

# Production
pnpm run build
pnpm run start:prod
```

### Local Testing with ngrok

```bash
# Start the server
pnpm run start:dev

# In another terminal, expose via ngrok
ngrok http 3001

# Use the ngrok URL for webhook registration
# https://abc123.ngrok.io/webhook/camp-sales
```

## API Endpoints

### Status & Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET /` | Status | Returns service info and configured webhooks |
| `GET /health` | Health Check | Returns `{ status: 'ok', timestamp: '...' }` |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST /webhook/:appSlug` | Webhook Handler | Receives Podio webhook events |

## Deployment

### VPS Deployment

```mermaid
flowchart LR
    subgraph VPS
        PM[PM2/systemd]
        APP[NestJS App]
        PM --> APP
    end

    subgraph DNS
        D[events.ecoventureme.com]
    end

    subgraph Reverse Proxy
        N[Nginx/Caddy]
    end

    D --> N
    N -->|:3001| APP
```

1. **Build the application**
   ```bash
   pnpm run build
   ```

2. **Copy to server**
   ```bash
   scp -r dist/ package.json pnpm-lock.yaml .env user@server:/app/
   ```

3. **Install dependencies on server**
   ```bash
   cd /app && pnpm install --prod
   ```

4. **Run with PM2**
   ```bash
   pm2 start dist/main.js --name eco-podio-webhook
   pm2 save
   ```

5. **Configure reverse proxy** (Nginx example)
   ```nginx
   server {
       listen 443 ssl;
       server_name webhooks.ecoventureme.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Data Flow Summary

```mermaid
flowchart TB
    subgraph Podio [Podio - Source of Truth]
        OPP[Opportunities]
        SALE[Sales]
        CAMP[Camp Items]
    end

    subgraph Webhook Service
        WH[Webhook Handler]
        DIFF[Revision Diff Check]
        FILTER[Monitored Field Filter]
    end

    subgraph Basecamp [Basecamp - Event Management]
        EVENT[Events]
        REG[Registrations]
    end

    OPP -->|item.update| WH
    SALE -->|item.update| WH
    CAMP -->|item.update| WH

    WH --> DIFF
    DIFF --> FILTER

    FILTER -->|Field Changed| EVENT
    FILTER -->|Create Button Clicked| EVENT

    EVENT -.->|URL returned| SALE
    REG -.->|Pull Data button| CAMP
```

## Related Documentation

- [Podio API Documentation](https://developers.podio.com/)
- [Podio Webhooks Guide](https://developers.podio.com/doc/hooks)
- [Integration Tasks](./podio-basecamp-integration-tasks.md)

## License

Private - Ecoventure
