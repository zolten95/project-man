"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { data, error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      console.error("Login error:", error);
      // Check if it's an email confirmation error
      if (error.message?.includes("email") && error.message?.includes("confirm")) {
        setError(
          "Please check your email to confirm your account before logging in. To disable email confirmation, go to Supabase Dashboard > Authentication > Settings."
        );
      } else {
        setError(error.message || "Wrong email or password.");
      }
      return;
    }

    console.log("Login successful:", data);

    router.push("/setup");
  }

  async function handleGoogle() {
    try {
      setError(null);
      setOauthLoading(true);
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/setup`,
        },
      });
      if (error) {
        setError("Google sign-in failed. Please try again.");
        setOauthLoading(false);
      }
      // On success, Supabase will redirect away, so we don't unset loading here.
    } catch {
      setError("Google sign-in failed. Please try again.");
      setOauthLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 border border-zinc-800 rounded-xl p-8 bg-zinc-900 shadow-lg"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-zinc-400">Log in to your workspace</p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="block text-sm text-zinc-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md px-3 py-2 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm text-zinc-300" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-md px-3 py-2 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <button
          type="submit"
          disabled={loading || oauthLoading}
          className="w-full bg-[#6295ff] hover:bg-[#4b7af0] disabled:opacity-60 text-white rounded-md py-2.5 font-medium transition-colors"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <div className="flex-1 h-px bg-zinc-800" />
          <span>or</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading || oauthLoading}
          className="w-full flex items-center justify-center gap-2 border border-zinc-700 hover:bg-zinc-800 disabled:opacity-60 rounded-md py-2.5 text-sm font-medium text-zinc-100 transition-colors"
        >
          <span>Continue with Google</span>
        </button>

        <p className="text-sm text-center text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#6295ff] underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}


