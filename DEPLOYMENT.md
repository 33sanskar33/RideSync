# RideSync production deployment

This project is a Vite + React single-page app backed by Supabase. The repository includes Vercel configuration for client-side routes and the RideSync service worker.

## 1. Configure local environment

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` to your Supabase project URL.
3. Set `VITE_SUPABASE_PUBLISHABLE_KEY` to the project's publishable key (or legacy anon key).
4. Do not use a Supabase service-role/secret key in the browser or in any `VITE_*` variable.

## 2. Deploy on Vercel

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import `33sanskar33/RideSync`.
3. Keep the detected Vite defaults:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
4. Add these Environment Variables for **Production**, **Preview**, and **Development** as appropriate:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. Deploy. The included `vercel.json` sends app routes such as `/dashboard/history` and `/room/:id` to the SPA entry point and applies safe service-worker headers.

## 3. Update Supabase after deployment

In Supabase **Authentication → URL Configuration**:

1. Set **Site URL** to the deployed RideSync origin (for example, `https://your-project.vercel.app`).
2. Add the deployed origin and any intended preview origins to **Redirect URLs**.
3. Keep local development URLs only if you still use them.

Confirm the deployed Supabase project has the required RideSync database migrations applied and the `get-vapid-public-key` and `send-sos-push` Edge Functions deployed with their required secrets. Never put VAPID private keys or Supabase service-role keys in Vercel's `VITE_*` variables.

## 4. Production smoke test

After deployment, test using two separate signed-in devices/accounts:

- Sign up, sign in, sign out, and reload a protected route directly.
- Create a room on one device and join it on another.
- Confirm live rider locations and leader identity update.
- Start, pause, resume, and end a ride; verify the elapsed timer.
- Send a group chat message.
- Send an SOS and verify the in-app alert and background push notification on the other device.
- Open Ride History and Statistics.
- Install the PWA from the deployed HTTPS site and confirm the app icon, standalone launch, and service-worker update behavior.

## Notes

- Browser geolocation and installable PWA behavior require HTTPS in production (localhost is allowed for local development).
- The app shell can load from cache during brief network interruptions; live maps, GPS sharing, Supabase data, chat, and notifications still require network access.
- This repository configuration prepares Vercel deployment; it does not create a Vercel project or deploy without connecting the GitHub repository and setting environment variables in Vercel.
