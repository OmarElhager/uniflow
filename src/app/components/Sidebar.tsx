"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const navigation = [
  { name: "Dashboard", path: "/" },
  { name: "Modules", path: "/modules" },
  { name: "Calendar", path: "/calendar" },
  { name: "Tasks", path: "/tasks" },
  { name: "Study", path: "/study" },
  { name: "Search", path: "/search" },
  { name: "Profile", path: "/profile" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  function isActive(path: string) {
    if (path === "/") {
      return pathname === "/";
    }

    return pathname === path || pathname.startsWith(path + "/");
  }

  function navigate(path: string) {
    setMobileOpen(false);
    router.push(path);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    const query = searchQuery.trim();

    if (!query) {
      router.push("/search");
      return;
    }

    router.push("/search?q=" + encodeURIComponent(query));
    setMobileOpen(false);
  }

  return (
    <>
      {/* Desktop Sidebar */}

      <aside className="hidden w-64 shrink-0 border-r border-black/5 bg-white p-6 md:block">
        <div className="mb-8">
          <button
            onClick={() => router.push("/")}
            className="group text-left"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4f7cff] text-sm font-bold text-white shadow-sm">
                U
              </div>

              <h1 className="text-2xl font-bold tracking-tight">
                UniFlow
              </h1>
            </div>

            <p className="mt-2 text-sm text-black/40">
              Your university, organised.
            </p>
          </button>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-black/30">
              🔎
            </span>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-xl border border-black/5 bg-[#f7f8fc] py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-black/30 focus:border-[#4f7cff]/40 focus:bg-white focus:ring-4 focus:ring-[#4f7cff]/5"
            />
          </div>
        </form>

        <nav className="space-y-1.5">
          {navigation.map((item) => {
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={
                  "flex w-full items-center rounded-xl px-4 py-3 text-left text-sm transition " +
                  (active
                    ? "bg-[#eef3ff] font-semibold text-[#315edc]"
                    : "text-black/55 hover:bg-black/[0.03] hover:text-black")
                }
              >
                <span
                  className={
                    "mr-3 h-1.5 w-1.5 rounded-full transition " +
                    (active
                      ? "bg-[#4f7cff]"
                      : "bg-black/10")
                  }
                />

                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="mt-8 rounded-2xl border border-[#e5ebff] bg-[#f4f7ff] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4f7cff] text-xs text-white">
              ✦
            </div>

            <p className="text-xs font-bold text-[#315edc]">
              UniFlow Plus
            </p>
          </div>

          <p className="mt-2 text-xs leading-5 text-black/40">
            AI-powered study tools are coming later.
          </p>
        </div>
      </aside>

      {/* Mobile Navigation */}

      <div className="relative z-40 md:hidden">
        <div className="flex h-14 items-center justify-between border-b border-black/5 bg-white px-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4f7cff] text-xs font-bold text-white">
              U
            </div>

            <div className="text-left">
              <span className="block text-lg font-bold leading-none">
                UniFlow
              </span>

              <span className="mt-0.5 block text-[10px] text-black/35">
                Your university, organised.
              </span>
            </div>
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/5 bg-[#f7f8fc] text-base"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? "×" : "☰"}
          </button>
        </div>

        {mobileOpen && (
          <div className="absolute right-4 top-16 w-64 rounded-2xl border border-black/5 bg-white p-3 shadow-xl">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-black/30">
                  🔎
                </span>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full rounded-xl border border-black/5 bg-[#f7f8fc] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#4f7cff]/40 focus:bg-white focus:ring-4 focus:ring-[#4f7cff]/5"
                />
              </div>
            </form>

            <div className="space-y-1">
              {navigation.map((item) => {
                const active = isActive(item.path);

                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={
                      "flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition " +
                      (active
                        ? "bg-[#eef3ff] font-semibold text-[#315edc]"
                        : "text-black/55 hover:bg-black/[0.03] hover:text-black")
                    }
                  >
                    <span
                      className={
                        "mr-3 h-1.5 w-1.5 rounded-full " +
                        (active
                          ? "bg-[#4f7cff]"
                          : "bg-black/10")
                      }
                    />

                    {item.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 rounded-xl bg-[#f4f7ff] p-3">
              <p className="text-xs font-semibold text-[#315edc]">
                ✦ UniFlow Plus
              </p>

              <p className="mt-1 text-[11px] leading-4 text-black/40">
                AI study tools coming later.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}