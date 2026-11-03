import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'RideSync configuration error: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must both be set in the deployment environment.'
  );
}

let parsedSupabaseUrl: URL;

try {
  parsedSupabaseUrl = new URL(supabaseUrl);
} catch {
  throw new Error(
    'RideSync configuration error: VITE_SUPABASE_URL is not a valid URL. Check the Supabase project URL in the deployment environment.'
  );
}

if (
  (parsedSupabaseUrl.protocol !== 'https:' && parsedSupabaseUrl.protocol !== 'http:') ||
  !parsedSupabaseUrl.hostname
) {
  throw new Error(
    'RideSync configuration error: VITE_SUPABASE_URL must be a valid HTTP or HTTPS URL.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
