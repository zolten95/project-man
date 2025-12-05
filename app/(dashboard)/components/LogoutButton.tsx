"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await supabaseBrowser.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="fixed bottom-6 right-6 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-lg z-50"
      title="Logout"
    >
      Logout
    </button>
  );
}

