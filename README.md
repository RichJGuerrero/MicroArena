# 🏟️ MicroArena

**Integrity-First Competitive Gaming Platform**

A full-stack competitive gaming platform with Auth0 authentication, clan management, beef matches, tournaments, and an integrity-based ranking system.

## Features

- **🔐 Authentication** - Auth0 integration (with demo mode fallback)
- **👥 Clans** - Create, join, and manage competitive teams
- **🥊 Beef Matches** - Challenge rival clans to direct showdowns
- **🏆 Tournaments** - Tiered competition (Showcase/Premier/Open)
- **📊 Ladder** - ELO-based seasonal rankings
- **⚖️ Integrity System** - Reputation-based tournament access

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Auth0 (Optional)

Copy `.env.example` to `.env` and fill in your Auth0 credentials:

```bash
cp .env.example .env
```

**Without Auth0**: The app runs in demo mode with username-only login.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Auth0 Setup

1. Create a Single Page Application in [Auth0 Dashboard](https://manage.auth0.com/)
2. Configure these URLs in your Auth0 app settings:
   - **Allowed Callback URLs**: `http://localhost:5173/callback`
   - **Allowed Logout URLs**: `http://localhost:5173`
   - **Allowed Web Origins**: `http://localhost:5173`
3. Add credentials to `.env`:
   ```
   PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
   PUBLIC_AUTH0_CLIENT_ID=your-client-id
   ```

## Integrity System

| Tier | Requirement | Description |
|------|-------------|-------------|
| **Showcase** | 100% | Elite tournaments, perfect integrity |
| **Premier** | 90%+ | High-level competitive play |
| **Open** | 50%+ | Entry-level, all welcome |

Integrity decreases from violations (stalling, no-shows, toxicity, cheating) and can be restored through fair play.

## Project Structure

```
src/
├── lib/
│   ├── auth.ts          # Auth0 + demo auth
│   ├── types.ts         # TypeScript types
│   └── server/
│       └── store.ts     # In-memory data store
├── routes/
│   ├── api/             # REST API endpoints
│   │   ├── auth/        # Authentication
│   │   ├── users/       # User management
│   │   ├── clans/       # Clan operations
│   │   ├── beef/        # Beef matches
│   │   ├── tournaments/ # Tournament system
│   │   ├── ladder/      # Rankings
│   │   └── integrity/   # Integrity events
│   ├── beef/            # Beef matches page
│   ├── clans/           # Clan pages
│   ├── integrity/       # Integrity info
│   ├── ladder/          # Rankings page
│   ├── profile/         # User profile
│   └── tournaments/     # Tournaments page
└── app.css              # Global styles
```

## API Endpoints

### Authentication
- `POST /api/auth/sync` - Sync Auth0 user
- `POST /api/auth/demo-login` - Demo login
- `POST /api/auth/demo-signup` - Demo signup

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user profile

### Clans
- `GET /api/clans` - List all clans
- `POST /api/clans` - Create clan
- `GET /api/clans/:id` - Get clan details
- `POST /api/clans/:id/join` - Join clan
- `POST /api/clans/:id/leave` - Leave clan

### Beef Matches
- `GET /api/beef` - List beef matches
- `POST /api/beef` - Create beef match
- `POST /api/beef/:id/respond` - Accept/decline
- `POST /api/beef/:id/complete` - Record result

### Tournaments
- `GET /api/tournaments` - List tournaments
- `POST /api/tournaments/:id/register` - Register team

### Ladder
- `GET /api/ladder` - Get rankings

### Integrity
- `GET /api/integrity?userId=` - Get events
- `POST /api/integrity` - Report violation

## Production Deployment

1. Set production Auth0 URLs
2. Replace in-memory store with database (Postgres recommended)
3. Deploy to Vercel, Netlify, or any Node.js host

```bash
npm run build
npm run preview
```

## Tech Stack

- **Frontend**: SvelteKit, TypeScript
- **Styling**: Custom CSS (Black/Orange/White theme)
- **Auth**: Auth0 SPA SDK
- **Data**: In-memory (V0) → PostgreSQL (V1)

## License

MIT

---

Built with ♥ for competitive gaming
