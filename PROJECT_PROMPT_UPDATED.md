# WhatsApp Business Platform — Project Brief

## Overview
A full-stack WhatsApp Business API management platform with a React + shadcn frontend and Express 5 backend, deployable on Vercel as a serverless app with JSON file storage (no database needed).

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 7 + Tailwind CSS 4 + shadcn/ui |
| Backend | Express 5 + TypeScript |
| Auth | JWT (access + refresh tokens) |
| Data | In-memory JSON file store (persisted to `/tmp/` on Vercel) |
| Package mgr | pnpm workspace (monorepo) |
| Deployment | Vercel (serverless function + static SPA) |
| PWA | Manifest + service worker (installable on Windows/Android) |

## Project Structure
```
whatsapp-bot/
├── api/                          # Vercel serverless entry point
│   └── index.ts                  # imports compiled app from artifacts/api-server/dist/app.js
├── artifacts/
│   ├── api-server/               # Express backend
│   │   └── src/
│   │       ├── app.ts            # Express app setup (CORS, JSON, pino-http)
│   │       ├── index.ts          # Server listener (PORT env)
│   │       ├── seed-admin.ts     # Seeds admin@talha.com / Admin@1234
│   │       ├── lib/
│   │       │   ├── store.ts      # JSON file data store (all CRUD ops)
│   │       │   └── logger.ts     # Pino logger
│   │       ├── middlewares/
│   │       │   └── auth.ts       # JWT sign/verify + requireAuth middleware
│   │       └── routes/
│   │           ├── index.ts      # Route aggregator
│   │           ├── health.ts     # GET /healthz
│   │           ├── auth.ts       # register, login, refresh, me, change-password, logout
│   │           ├── customers.ts  # CRUD + stats + import + notes
│   │           ├── campaigns.ts  # CRUD + schedule/pause/resume/cancel/duplicate/analytics
│   │           ├── templates.ts  # CRUD + search/filter
│   │           ├── conversations.ts # CRUD + messages + handoff + close
│   │           ├── dashboard.ts  # kpis, activity, message-stats, campaign-status, recent-campaigns
│   │           ├── analytics.ts  # overview, message-timeline, top-campaigns
│   │           ├── settings.ts   # whatsapp, ai, business settings (GET/PUT)
│   │           └── webhooks.ts   # Meta webhook verify (GET) + inbound message ingest (POST)
│   └── mockup-sandbox/           # React frontend
│       ├── index.html            # SPA entry with PWA meta tags
│       ├── vite.config.ts        # Vite config (React + Tailwind plugins)
│       ├── components.json       # shadcn config
│       ├── mockupPreviewPlugin.ts # Legacy mockup plugin (unused)
│       ├── public/
│       │   ├── manifest.json     # PWA manifest
│       │   ├── sw.js             # Service worker (basic install support)
│       │   └── icons/            # SVG icons (192x192, 512x512)
│       └── src/
│           ├── main.tsx          # Entry point (AuthProvider wrapper)
│           ├── App.tsx           # Root component (Login vs Layout router)
│           ├── index.css         # Tailwind v4 + shadcn CSS variables
│           ├── lib/
│           │   ├── api.ts        # Fetch wrapper with JWT auth header
│           │   └── utils.ts      # cn() utility (clsx + tailwind-merge)
│           ├── hooks/
│           │   ├── useAuth.tsx    # Auth context (login/logout/token storage)
│           │   ├── use-mobile.tsx # Mobile detection hook
│           │   └── use-toast.ts   # Toast notification system
│           ├── components/
│           │   ├── Layout.tsx     # Sidebar layout with nav
│           │   └── ui/           # 60+ shadcn primitives (button, card, dialog, etc.)
│           └── pages/
│               ├── Login.tsx      # Login form (pre-filled defaults)
│               ├── Dashboard.tsx  # KPI cards
│               ├── Customers.tsx  # Customer table
│               └── Settings.tsx   # WhatsApp credentials form
├── public/                       # Frontend build output (gitignored)
├── vercel.json                   # Build + deploy config
├── pnpm-workspace.yaml           # Workspace definition + overrides
├── package.json                  # Root workspace package
└── .env.example                  # Documents all env vars
```

## Current Frontend Pages (Built)
| Route | Component | Status |
|-------|-----------|--------|
| `/` | Dashboard — KPI cards | ✅ Built |
| `/customers` | Customers — table | ✅ Built |
| `/settings` | Settings — WhatsApp credentials form | ✅ Built |
| `/ (no auth)` | Login — email/password form | ✅ Built |

## Frontend Pages (NOT built — need implementation)
| Route | Component | What to build |
|-------|-----------|---------------|
| `/campaigns` | CampaignsList | Table of campaigns with CRUD, create/schedule/pause/resume modal |
| `/campaigns/:id` | CampaignDetail | Campaign analytics, timeline, message logs |
| `/templates` | TemplatesList | Message template CRUD with form editor |
| `/conversations` | ConversationsList | Chat inbox showing conversations per customer |
| `/conversations/:id` | ConversationDetail | Real-time chat view with message send/reply |
| `/analytics` | Analytics | Overview charts, message timeline, top campaigns (recharts) |

## API Routes (56 total, all prefixed with `/api`)
### Auth
- `POST /auth/register` — Register user
- `POST /auth/login` — Login → JWT tokens
- `POST /auth/refresh` — Refresh token
- `GET /auth/me` — Current user profile
- `POST /auth/change-password` — Change password
- `POST /auth/logout` — Invalidate refresh token

### Customers
- `GET /customers` — List (search, status, tags, pagination)
- `GET /customers/stats` — Statistics
- `GET /customers/:id` — Get by ID
- `POST /customers` — Create
- `PUT /customers/:id` — Update
- `DELETE /customers/:id` — Delete
- `POST /customers/import` — Bulk import
- `GET /customers/:id/notes` — List notes
- `POST /customers/:id/notes` — Add note
- `DELETE /customers/:customerId/notes/:noteId` — Delete note

### Campaigns
- `GET /campaigns` — List (status, search, pagination)
- `GET /campaigns/:id` — Get by ID
- `POST /campaigns` — Create
- `PUT /campaigns/:id` — Update
- `DELETE /campaigns/:id` — Delete
- `POST /campaigns/:id/schedule` — Schedule
- `POST /campaigns/:id/pause` — Pause
- `POST /campaigns/:id/resume` — Resume
- `POST /campaigns/:id/cancel` — Cancel
- `POST /campaigns/:id/duplicate` — Duplicate
- `GET /campaigns/:id/analytics` — Campaign-level analytics

### Templates
- `GET /templates` — List (search, category, status)
- `GET /templates/:id` — Get by ID
- `POST /templates` — Create
- `PUT /templates/:id` — Update
- `DELETE /templates/:id` — Delete

### Conversations
- `GET /conversations` — List (status, search, pagination, joined with customer)
- `GET /conversations/:id` — Get with messages
- `POST /conversations` — Create
- `GET /conversations/:id/messages` — Get messages
- `POST /conversations/:id/messages` — Send message
- `POST /conversations/:id/handoff` — Assign agent
- `POST /conversations/:id/close` — Close

### Dashboard
- `GET /dashboard/kpis` — Top-level KPIs
- `GET /dashboard/activity` — Recent activity log
- `GET /dashboard/message-stats` — 7-day message timeline
- `GET /dashboard/campaign-status` — Campaign breakdown counts
- `GET /dashboard/recent-campaigns` — Recent campaigns list

### Analytics
- `GET /analytics/overview` — Aggregated stats
- `GET /analytics/message-timeline` — 7-day timeline
- `GET /analytics/top-campaigns` — Top campaigns by sent count

### Settings
- `GET /settings/whatsapp` — Get WhatsApp credentials
- `PUT /settings/whatsapp` — Update WhatsApp credentials
- `GET /settings/ai` — Get AI config
- `PUT /settings/ai` — Update AI config
- `GET /settings/business` — Get business info
- `PUT /settings/business` — Update business info

### Webhooks (no auth required)
- `GET /webhooks/whatsapp` — Meta verification (hub.challenge)
- `POST /webhooks/whatsapp` — Inbound message ingest

### Health
- `GET /healthz` — Health check

## Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | ✅ (or SESSION_SECRET) | — | Min 32 chars for JWT signing |
| `SESSION_SECRET` | fallback for JWT_SECRET | — | Alternative secret var |
| `PORT` | ❌ | `"3000"` | Express listen port |
| `DATA_DIR` | ❌ | `"/tmp"` (Vercel) or `./data/` | JSON store directory |
| `NODE_ENV` | ❌ | — | Set `"production"` for pino-pretty off |
| `LOG_LEVEL` | ❌ | `"info"` | Pino log level |
| `WA_VERIFY_TOKEN` | ❌ | `""` | Fallback webhook verify token |
| `VERCEL` | auto by Vercel | — | Auto-set; determines `/tmp` data dir |

WhatsApp credentials (phoneNumberId, accessToken, businessAccountId, webhookVerifyToken) are configured via the Settings page at `/settings`, not environment variables.

## Auth Flow
1. `POST /api/auth/login` with email/password → returns `{ accessToken, refreshToken, user }`
2. Store token in `localStorage` under `"token"` key
3. All API calls include `Authorization: Bearer <token>` header
4. Token expiry: access token = 15 min, refresh token = 7 days
5. `POST /api/auth/refresh` to get new tokens
6. `POST /api/auth/logout` invalidates refresh token

## Data Storage
- JSON file at `DATA_DIR/store.json`
- On Vercel: `/tmp/store.json` (ephemeral, resets on cold start)
- Locally: `<repo>/data/store.json` (persistent)
- Auto-seeds admin user (`admin@talha.com` / `Admin@1234`) when store is empty
- All mutations write to disk immediately
- Activity log capped at 500 entries

## Deployment (Vercel)
- **URL:** https://whatsapp-bot-kappa-two.vercel.app
- **Build:** `pnpm --filter mockup-sandbox run build && pnpm exec tsc -p artifacts/api-server/tsconfig.vercel.json`
- **Install:** `npm install -g pnpm && pnpm install --no-frozen-lockfile`
- **Rewrites:** `/api/*` → serverless function, everything else → `index.html` (SPA)
- **Serverless entry:** `api/index.ts` imports `artifacts/api-server/dist/app.js`
- **Important:** The `public/` directory at project root is the frontend build output (gitignored). The `public/` inside `mockup-sandbox/` is the source for PWA static files (committed).

## Data Types (store.ts interfaces)
```typescript
User { id, email, password, name, role: "admin"|"agent", avatar, refreshToken, createdAt, updatedAt }
Customer { id, name, phone, email?, tags[], status: "active"|"inactive"|"blocked", assignedTo?, waId?, createdAt, updatedAt }
CustomerNote { id, customerId, content, createdBy?, createdAt }
Template { id, name, category, status: "approved"|"pending"|"rejected", body, variables[], language, createdAt, updatedAt }
Campaign { id, name, templateId?, targetAudience[], status: "draft"|"scheduled"|"running"|"completed"|"paused"|"cancelled", scheduledAt?, startedAt?, completedAt?, sentCount, deliveredCount, readCount, failedCount, createdAt, updatedAt }
Conversation { id, customerId, status: "open"|"closed"|"pending", assignedTo?, lastMessageAt?, lastMessagePreview?, createdAt, updatedAt }
ConversationMessage { id, conversationId, direction: "inbound"|"outbound", type, content, status, waMessageId?, isAiGenerated, createdAt }
Setting { id, key, value, updatedAt }
ActivityLog { id, userId?, action, entity, entityId?, metadata?, createdAt }
```

## Notable TODOs / Gaps
1. **Outbound WhatsApp sending not implemented** — When sending a message via `POST /conversations/:id/messages`, it only stores locally; does NOT call the WhatsApp Cloud API
2. **Campaign execution not implemented** — Scheduled/running campaigns don't actually send WhatsApp messages
3. **Settings pages for AI + Business** — API endpoints exist (`GET/PUT /settings/ai`, `GET/PUT /settings/business`) but no frontend forms
4. **No real-time updates** — Conversations page needs polling or WebSocket for live messages
5. **Pagination/filtering on frontend tables** — Customers and Conversations tables don't expose the API's search/pagination params yet
6. **File uploads** — Customer import endpoint exists but no file upload UI for CSV

## Default Credentials
- Email: `admin@talha.com`
- Password: `Admin@1234`

---

Use this document to understand the full scope of the project and continue building features. The frontend uses simple path-based routing (no React Router — uses `window.location.pathname`). All shadcn/ui components are available in `src/components/ui/`. API calls go through `src/lib/api.ts` which automatically injects the JWT token.


---

# Additional Product Requirements (Enhanced)

## Advanced Customer Management

The platform should support enterprise-grade customer management.

### Customer Features

- Create Customer
- Edit Customer
- Delete Customer
- Archive Customer
- Restore Customer
- Block / Unblock Customer
- Favorite Customers
- Customer Tags
- Customer Groups
- Customer Segments
- Customer Notes
- Customer Timeline
- Customer Conversation History
- Last Contact Date
- Last Reply Date
- Last Campaign Sent
- Customer Statistics
- Assigned Agent
- Bulk Edit
- Bulk Delete
- Bulk Tagging
- Bulk Status Update
- Duplicate Detection
- Merge Duplicate Customers

### Contact Import

Support importing contacts from:

- CSV
- Excel (.xlsx)
- Manual Entry
- Copy/Paste Phone Numbers

Import process should include:

- Preview Before Import
- Duplicate Detection
- Invalid Number Detection
- Country Code Normalization
- E.164 Phone Validation
- Import Summary
- Failed Record Report
- Export Failed Records

---

## Custom Message Builder

The platform must support both Meta Templates and Custom Messages.

### Message Types

- Meta Approved Templates
- Custom Text Messages
- Promotional Messages
- Follow-up Messages
- Welcome Messages
- Reminder Messages
- Festival Greetings
- Broadcast Messages

### Dynamic Variables

Support placeholders such as:

- Customer Name
- Company Name
- Phone Number
- Custom Fields

Future support:

- Images
- Videos
- PDFs
- Audio
- Documents
- Contact Cards
- Locations
- Quick Replies
- CTA Buttons

---

## Campaign Enhancements

Campaign types:

- Promotional
- Announcement
- Reminder
- Welcome
- Birthday
- Festival
- Follow-up
- Custom

Audience Selection:

- All Customers
- Selected Customers
- Tags
- Groups
- CSV Import
- Manual Selection

Campaign Scheduling:

- Send Now
- Schedule Date & Time
- Timezone Selection
- Retry Failed Messages

Campaign Analytics:

- Sent
- Delivered
- Read
- Failed
- Replied
- Pending

---

## Conversation Management

Every conversation should support:

- Customer Details
- Previous Messages
- Internal Notes
- AI Suggested Replies
- Search
- Filters
- Archive
- Pin
- Export
- Close
- Reopen

Conversation Status:

- Open
- Pending
- Closed

Message Status:

- Sending
- Sent
- Delivered
- Read
- Failed

---

## Official WhatsApp Features

The application must only use the Official Meta WhatsApp Business Platform API.

Support:

- Webhook Verification
- Incoming Messages
- Outgoing Messages
- Template Messages
- Custom Messages
- Bulk Messaging
- Scheduled Messaging
- Delivery Status
- Read Status
- Retry Failed Messages
- Media Upload
- Business Verification Guidance

---

## Business Settings

Business Profile

- Business Name
- Logo
- Description
- Email
- Phone
- Website
- Timezone
- Language
- Currency

WhatsApp Configuration

- Phone Number ID
- Business Account ID
- Access Token
- Verify Token

AI Configuration

- API Key
- Prompt Settings
- Knowledge Base

---

## Reporting

Dashboard analytics should include:

- Customer Growth
- Active Customers
- Inactive Customers
- Campaign Performance
- Delivery Rate
- Read Rate
- Reply Rate
- Failure Rate
- Top Campaigns
- Top Customers
- Daily, Weekly and Monthly Reports
- Average Response Time

---

## Future Expansion

The architecture should remain modular to allow future integrations with:

- Instagram
- Facebook Messenger
- Telegram
- Email
- SMS
- Shopify
- WooCommerce
- Stripe
- CRM Systems
- ERP Systems

These integrations are future enhancements and should not complicate the current implementation.
