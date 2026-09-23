import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Use fallback placeholders if credentials are empty to prevent client-side crashes
export const supabase = createClient(
    url && url.length > 0 ? url : 'https://placeholder.supabase.co',
    key && key.length > 0 ? key : 'placeholder-key'
);