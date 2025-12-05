import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
  );
}

// TypeScript now knows these are strings after the check above
const url: string = supabaseUrl;
const key: string = supabaseAnonKey;

export function createSupabaseBrowserClient() {
  return createBrowserClient(url, key);
}

// For backward compatibility, export a singleton instance
export const supabaseBrowser = createBrowserClient(url, key);

