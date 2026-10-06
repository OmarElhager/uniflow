"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Make sure Supabase actually created a session
      if (!data.session) {
        setError(
          "Account created, but you are not logged in yet. Please check your email to confirm your account."
        );
        setLoading(false);
        return;
      }

      router.push("/onboarding");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      router.push("/");
    }

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">
            UniFlow
          </h1>

          <p className="mt-2 text-black/50">
            {isSignup
              ? "Create your student account"
              : "Welcome back"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Email
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.com"
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Password
              </label>

              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black py-3 font-semibold text-white transition hover:bg-black/80 disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : isSignup
                ? "Create account"
                : "Log in"}
            </button>

          </form>

          {/* Switch login/signup */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
              }}
              className="text-sm text-black/50 hover:text-black"
            >
              {isSignup
                ? "Already have an account? Log in"
                : "Don't have an account? Create one"}
            </button>
          </div>

        </div>

      </div>
    </main>
  );
}