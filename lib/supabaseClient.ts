import { createBrowserClient } from "@supabase/ssr";

// NOTE: Using direct values to avoid env loading issues during development.
// In production, move these back to process.env.
const supabaseUrl = "https://gnciozvdkbkqoqxwbolu.supabase.co";
const supabaseAnonKey = "sb_publishable_YkrxnAzV5emf7CrEXGpufg_v1SoJmfE";

export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// For backward compatibility, export a singleton instance
export const supabaseBrowser = createBrowserClient(supabaseUrl, supabaseAnonKey);

