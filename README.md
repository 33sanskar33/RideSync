# RideSync

**Stay together on every ride.**

RideSync is a mobile-first group motorcycle riding platform. Riders can create or join a ride room, share their live location with the group, follow the ride on a map, and use in-ride safety features.

**Production app:** https://ride-sync-7lik.vercel.app

## What RideSync offers

- **Ride rooms:** Create a room as the ride leader or join an existing room with a room code.
- **Live group map:** View participating riders on a shared map while a ride is active.
- **Ride planning:** Set a destination and view the route.
- **Rider information:** View ride participants and live riding information, including speed.
- **Safety tools:** SOS alerts and push notifications.
- **Group communication:** In-room group chat.
- **Ride records:** Ride history and statistics.
- **Account controls:** Profile, settings, password recovery, and account management.
- **Installable experience:** Progressive Web App support for compatible browsers and devices.

Availability of location, notifications, and other device capabilities depends on browser permissions, device support, and network connectivity.

## Tech stack

- React 18 and TypeScript
- Vite
- Supabase (authentication, database, and realtime features)
- Leaflet and React Leaflet (maps)
- React Router
- Progressive Web App assets and service worker

## Run locally

### Requirements

- Node.js and npm
- A Supabase project with the RideSync database schema and required backend functions configured

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/33sanskar33/RideSync.git
   cd RideSync
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create your local environment file:

   - Copy `.env.example` to `.env.local`.
   - Fill in the Supabase project URL and publishable key.

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the local URL printed by Vite in your browser.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Vite development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the TypeScript application type check |

## Environment and security

- Only use a Supabase **publishable** key (or legacy anon key, if your project still uses one) in `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Never put a Supabase service-role key, secret key, database password, or other server secret in a `VITE_*` variable. Vite exposes these values to browser code.
- Keep `.env.local` out of Git. The repository's `.env.example` contains placeholders only.
- Configure database policies, database functions, and Edge Functions in Supabase with least-privilege access. A publishable key is not a substitute for backend authorization.
- Location sharing requires the rider's permission and a supported secure browser context (HTTPS, or localhost during development).
- Do not rely on RideSync as a replacement for safe riding practices, emergency services, or a dedicated emergency communication system.

## Deployment

The production web app is hosted on Vercel. To deploy your own instance:

1. Import the repository into Vercel.
2. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the required Vercel environments.
3. Ensure the matching Supabase project has the RideSync schema, policies, and backend functions configured.
4. Deploy and test authentication, room creation/joining, live location, maps, and notifications on real devices.

## Legal

The deployed application publishes its current [Privacy Policy](https://ride-sync-7lik.vercel.app/privacy) and [Terms of Service](https://ride-sync-7lik.vercel.app/terms). Review these documents and obtain appropriate legal advice before operating the service at larger scale or in additional jurisdictions.

## Contributing

Bug reports and improvement ideas are welcome through GitHub Issues and Pull Requests. Please include clear reproduction steps for bugs and avoid posting credentials, private location data, or other sensitive information.

---

RideSync is an independently developed project.
