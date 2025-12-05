import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// NOTE: Using direct values to avoid env loading issues during development.
// In production, move these back to process.env.
const supabaseUrl = "https://gnciozvdkbkqoqxwbolu.supabase.co";
const supabaseAnonKey = "sb_publishable_YkrxnAzV5emf7CrEXGpufg_v1SoJmfE";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

