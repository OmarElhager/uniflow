"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";

type Profile = {
  full_name: string | null;
  university: string | null;
  degree: string | null;
  year_of_study: number | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    university: "",
    degree: "",
    year_of_study: 1,
  });

  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setError(userError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email || "");

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, university, degree, year_of_study")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          university: data.university || "",
          degree: data.degree || "",
          year_of_study: data.year_of_study || 1,
        });
      }
    } catch {
      setError("Something went wrong while loading your profile.");
    }

    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setError(userError.message);
        setSaving(false);
        return;
      }

      if (!user) {
        router.push("/login");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          university: profile.university,
          degree: profile.degree,
          year_of_study: Number(profile.year_of_study),
        })
        .eq("id", user.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      setMessage("Profile updated successfully.");
    } catch {
      setError("Something went wrong while saving your profile.");
    }

    setSaving(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      setLoggingOut(false);
      return;
    }

    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen bg-[#f7f7f5]">
        <Sidebar />

        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-10">
            <div className="animate-pulse">
              <div className="h-4 w-20 rounded bg-black/10" />
              <div className="mt-3 h-9 w-40 rounded bg-black/10" />
              <div className="mt-2 h-4 w-72 rounded bg-black/5" />

              <div className="mt-8 h-96 rounded-3xl bg-white" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f7f7f5]">
      <Sidebar />

      <section className="min-w-0 flex-1">
        <div className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Account
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Profile
            </h1>

            <p className="mt-2 text-black/50">
              Manage your student information and account.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
              ✓ {message}
            </div>
          )}

          {/* Profile hero */}
          <div className="mb-6 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
            <div className="h-2 bg-blue-500" />

            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-blue-50 text-2xl font-bold text-blue-700">
                {profile.full_name
                  ? profile.full_name
                      .split(" ")
                      .map((name) => name[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "U"}
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-semibold">
                  {profile.full_name || "Student"}
                </h2>

                <p className="mt-1 break-all text-sm text-black/45">
                  {email}
                </p>

                {profile.university && (
                  <p className="mt-2 text-sm font-medium text-blue-600">
                    {profile.university}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Personal information */}
          <form onSubmit={handleSave}>
            <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/5 px-6 py-5">
                <h2 className="font-semibold">
                  Student information
                </h2>

                <p className="mt-1 text-sm text-black/45">
                  Keep your university information up to date.
                </p>
              </div>

              <div className="grid gap-5 p-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Full name
                  </label>

                  <input
                    type="text"
                    value={profile.full_name || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        full_name: e.target.value,
                      })
                    }
                    placeholder="Your full name"
                    className="w-full rounded-xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    University
                  </label>

                  <input
                    type="text"
                    value={profile.university || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        university: e.target.value,
                      })
                    }
                    placeholder="Your university"
                    className="w-full rounded-xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Degree
                  </label>

                  <input
                    type="text"
                    value={profile.degree || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        degree: e.target.value,
                      })
                    }
                    placeholder="e.g. Mechanical Engineering"
                    className="w-full rounded-xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Year of study
                  </label>

                  <select
                    value={profile.year_of_study || 1}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        year_of_study: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  >
                    <option value={1}>Year 1</option>
                    <option value={2}>Year 2</option>
                    <option value={3}>Year 3</option>
                    <option value={4}>Year 4</option>
                    <option value={5}>Year 5+</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end border-t border-black/5 px-6 py-5">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </form>

          {/* Account */}
          <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/5 px-6 py-5">
              <h2 className="font-semibold">
                Account
              </h2>

              <p className="mt-1 text-sm text-black/45">
                Your UniFlow account information.
              </p>
            </div>

            <div className="divide-y divide-black/5">
              <div className="flex flex-col gap-2 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Email address
                  </p>

                  <p className="mt-1 text-sm text-black/45">
                    {email}
                  </p>
                </div>

                <span className="w-fit rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                  Account active
                </span>
              </div>

              <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Sign out
                  </p>

                  <p className="mt-1 text-sm text-black/45">
                    Sign out of your UniFlow account on this device.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-fit rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                >
                  {loggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}