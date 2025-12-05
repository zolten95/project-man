"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function RegisterPage() {
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

    // Sign up - with email confirmation disabled, user is immediately logged in
    const { data, error } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/setup`,
      },
    });

    if (error) {
      setLoading(false);
      console.error("Signup error:", error);
      // Show the actual error message
      setError(error.message || "Failed to create account. Please try again.");
      return;
    }

    console.log("Signup response:", data);

    // Check if user was created but needs email confirmation
    if (data.user && !data.session) {
      setLoading(false);
      setError(
        "Account created! Email confirmation is still enabled. Please check your email to confirm your account, then log in. To disable email confirmation, go to Supabase Dashboard > Authentication > Settings and turn off 'Enable email confirmations'."
      );
      return;
    }

    // Wait a moment for session to be established, then check
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check for active session
    const {
      data: { session },
    } = await supabaseBrowser.auth.getSession();

    console.log("Session after signup:", session);

    if (session) {
      // User is logged in, redirect to setup
      window.location.href = "/setup";
    } else {
      // Try one more time after a short delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      const {
        data: { session: retrySession },
      } = await supabaseBrowser.auth.getSession();

      if (retrySession) {
        window.location.href = "/setup";
      } else {
        setLoading(false);
        setError(
          "Account created but session not established. Email confirmation may still be enabled. Please check your email or disable email confirmation in Supabase Dashboard > Authentication > Settings."
        );
      }
    }
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
        setError("Google sign-up failed. Please try again.");
        setOauthLoading(false);
      }
      // On success, Supabase will redirect away.
    } catch {
      setError("Google sign-up failed. Please try again.");
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
          <h1 className="text-2xl font-semibold">Create account</h1>
          <p className="text-sm text-zinc-400">Start organizing your team</p>
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
          {loading ? "Creating account..." : "Sign up"}
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
          Already have an account?{" "}
          <Link href="/login" className="text-[#6295ff] underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}


