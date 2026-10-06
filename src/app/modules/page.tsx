"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";

type Module = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
};

type Lecture = {
  id: string;
  module_id: string;
  completed: boolean;
};

type Assignment = {
  id: string;
  module_id: string;
  completed: boolean;
};

type ModuleWithProgress = Module & {
  lectureTotal: number;
  lectureCompleted: number;
  assignmentTotal: number;
  assignmentCompleted: number;
  overallProgress: number;
};

const moduleAccents = [
  {
    icon: "bg-blue-600 text-white",
    soft: "bg-blue-50",
    text: "text-blue-600",
    bar: "bg-blue-500",
  },
  {
    icon: "bg-violet-600 text-white",
    soft: "bg-violet-50",
    text: "text-violet-600",
    bar: "bg-violet-500",
  },
  {
    icon: "bg-cyan-600 text-white",
    soft: "bg-cyan-50",
    text: "text-cyan-600",
    bar: "bg-cyan-500",
  },
  {
    icon: "bg-emerald-600 text-white",
    soft: "bg-emerald-50",
    text: "text-emerald-600",
    bar: "bg-emerald-500",
  },
  {
    icon: "bg-amber-500 text-white",
    soft: "bg-amber-50",
    text: "text-amber-600",
    bar: "bg-amber-500",
  },
  {
    icon: "bg-rose-500 text-white",
    soft: "bg-rose-50",
    text: "text-rose-600",
    bar: "bg-rose-500",
  },
];

export default function ModulesPage() {
  const router = useRouter();

  const [modules, setModules] = useState<Module[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadModules() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const [
      { data: moduleData, error: moduleError },
      { data: lectureData, error: lectureError },
      { data: assignmentData, error: assignmentError },
    ] = await Promise.all([
      supabase
        .from("modules")
        .select("id, name, code, description")
        .order("created_at", { ascending: true }),

      supabase
        .from("lectures")
        .select("id, module_id, completed"),

      supabase
        .from("assignments")
        .select("id, module_id, completed"),
    ]);

    if (moduleError) {
      setError(moduleError.message);
      setLoading(false);
      return;
    }

    if (lectureError) {
      setError(lectureError.message);
      setLoading(false);
      return;
    }

    if (assignmentError) {
      setError(assignmentError.message);
      setLoading(false);
      return;
    }

    setModules(moduleData || []);
    setLectures(lectureData || []);
    setAssignments(assignmentData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadModules();
  }, []);

  const modulesWithProgress = useMemo<ModuleWithProgress[]>(() => {
    return modules.map((module) => {
      const moduleLectures = lectures.filter(
        (lecture) => lecture.module_id === module.id
      );

      const moduleAssignments = assignments.filter(
        (assignment) => assignment.module_id === module.id
      );

      const lectureCompleted = moduleLectures.filter(
        (lecture) => lecture.completed
      ).length;

      const assignmentCompleted = moduleAssignments.filter(
        (assignment) => assignment.completed
      ).length;

      const lectureProgress =
        moduleLectures.length > 0
          ? Math.round(
              (lectureCompleted / moduleLectures.length) * 100
            )
          : 0;

      const assignmentProgress =
        moduleAssignments.length > 0
          ? Math.round(
              (assignmentCompleted /
                moduleAssignments.length) *
                100
            )
          : 0;

      let overallProgress = 0;

      if (
        moduleLectures.length > 0 &&
        moduleAssignments.length > 0
      ) {
        overallProgress = Math.round(
          (lectureProgress + assignmentProgress) / 2
        );
      } else if (moduleLectures.length > 0) {
        overallProgress = lectureProgress;
      } else if (moduleAssignments.length > 0) {
        overallProgress = assignmentProgress;
      }

      return {
        ...module,
        lectureTotal: moduleLectures.length,
        lectureCompleted,
        assignmentTotal: moduleAssignments.length,
        assignmentCompleted,
        overallProgress,
      };
    });
  }, [modules, lectures, assignments]);

  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return modulesWithProgress;
    }

    return modulesWithProgress.filter((module) => {
      const name = module.name.toLowerCase();
      const code = (module.code || "").toLowerCase();
      const description = (
        module.description || ""
      ).toLowerCase();

      return (
        name.includes(query) ||
        code.includes(query) ||
        description.includes(query)
      );
    });
  }, [modulesWithProgress, searchQuery]);

  const totalLectures = lectures.length;

  const completedLectures = lectures.filter(
    (lecture) => lecture.completed
  ).length;

  const totalAssignments = assignments.length;

  const completedAssignments = assignments.filter(
    (assignment) => assignment.completed
  ).length;

  const lecturePercentage =
    totalLectures > 0
      ? Math.round((completedLectures / totalLectures) * 100)
      : 0;

  const assignmentPercentage =
    totalAssignments > 0
      ? Math.round(
          (completedAssignments / totalAssignments) * 100
        )
      : 0;

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-black">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl p-5 md:p-8 lg:p-10">

            {/* Header */}
            <div className="mb-8">
              <p className="text-sm font-medium text-blue-600">
                Academic workspace
              </p>

              <div className="mt-1 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                    Modules
                  </h2>

                  <p className="mt-2 text-sm text-black/50 md:text-base">
                    Everything you're studying this year.
                  </p>
                </div>

                <button
                  onClick={() => router.push("/")}
                  className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black/80"
                >
                  + Add module
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Stats */}
            {!loading && modules.length > 0 && (
              <div className="mb-8 grid gap-4 sm:grid-cols-3">

                {/* Modules */}
                <div className="group rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                        Modules
                      </p>

                      <p className="mt-2 text-4xl font-bold tracking-tight text-blue-600">
                        {modules.length}
                      </p>

                      <p className="mt-1 text-xs text-black/35">
                        Active modules
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-600">
                      M
                    </div>
                  </div>
                </div>

                {/* Lectures */}
                <div className="group rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                        Lectures
                      </p>

                      <p className="mt-2 text-4xl font-bold tracking-tight text-violet-600">
                        {completedLectures}
                        <span className="text-xl text-black/20">
                          /{totalLectures}
                        </span>
                      </p>

                      <p className="mt-1 text-xs text-black/35">
                        {lecturePercentage}% completed
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-sm font-bold text-violet-600">
                      L
                    </div>
                  </div>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-violet-50">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{
                        width: lecturePercentage + "%",
                      }}
                    />
                  </div>
                </div>

                {/* Assignments */}
                <div className="group rounded-2xl border border-amber-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-black/40">
                        Assignments
                      </p>

                      <p className="mt-2 text-4xl font-bold tracking-tight text-amber-600">
                        {completedAssignments}
                        <span className="text-xl text-black/20">
                          /{totalAssignments}
                        </span>
                      </p>

                      <p className="mt-1 text-xs text-black/35">
                        {assignmentPercentage}% completed
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-sm font-bold text-amber-600">
                      A
                    </div>
                  </div>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-amber-50">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{
                        width: assignmentPercentage + "%",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-64 animate-pulse rounded-3xl border border-black/5 bg-white"
                  />
                ))}
              </div>
            ) : modules.length === 0 ? (
              /* Empty state */
              <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto max-w-md">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white shadow-lg shadow-blue-600/20">
                    M
                  </div>

                  <h3 className="mt-6 text-xl font-bold">
                    No modules yet
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-black/40">
                    Add your first module from the dashboard
                    to start organising your university work.
                  </p>

                  <button
                    onClick={() => router.push("/")}
                    className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
                  >
                    Go to dashboard
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="mb-6">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-black/35">
                      🔎
                    </span>

                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) =>
                        setSearchQuery(e.target.value)
                      }
                      placeholder="Search modules..."
                      className="w-full rounded-2xl border border-black/10 bg-white py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/5"
                    />
                  </div>
                </div>

                {filteredModules.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-black/15 bg-white p-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      🔎
                    </div>

                    <h3 className="mt-5 text-lg font-bold">
                      No modules found
                    </h3>

                    <p className="mt-2 text-sm text-black/40">
                      Try a different module name or code.
                    </p>

                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-5 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredModules.map((module) => {
                      const originalIndex = modules.findIndex(
                        (item) => item.id === module.id
                      );

                      const accent =
                        moduleAccents[
                          originalIndex >= 0
                            ? originalIndex %
                              moduleAccents.length
                            : 0
                        ];

                      return (
                        <button
                          key={module.id}
                          onClick={() =>
                            router.push(
                              "/modules/" + module.id
                            )
                          }
                          className="group relative overflow-hidden rounded-3xl border border-black/10 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-black/15 hover:shadow-lg"
                        >
                          {/* Accent line */}
                          <div
                            className={
                              "absolute left-0 top-0 h-1 w-full " +
                              accent.bar
                            }
                          />

                          <div className="flex items-start justify-between gap-4">
                            <div
                              className={
                                "flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold shadow-sm " +
                                accent.icon
                              }
                            >
                              {module.code
                                ? module.code
                                    .slice(0, 2)
                                    .toUpperCase()
                                : "M"}
                            </div>

                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-lg text-black/25 transition group-hover:bg-black group-hover:text-white">
                              →
                            </span>
                          </div>

                          <h3 className="mt-6 line-clamp-2 text-lg font-bold">
                            {module.name}
                          </h3>

                          {module.code && (
                            <p
                              className={
                                "mt-1 text-sm font-semibold " +
                                accent.text
                              }
                            >
                              {module.code}
                            </p>
                          )}

                          {module.description && (
                            <p className="mt-4 line-clamp-2 text-sm leading-6 text-black/50">
                              {module.description}
                            </p>
                          )}

                          {/* Progress */}
                          <div className="mt-6">
                            <div className="mb-2 flex items-center justify-between text-[11px]">
                              <span className="font-medium text-black/40">
                                Overall progress
                              </span>

                              <span
                                className={
                                  "font-bold " +
                                  (module.overallProgress === 100
                                    ? "text-emerald-600"
                                    : accent.text)
                                }
                              >
                                {module.overallProgress}%
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-black/5">
                              <div
                                className={
                                  "h-full rounded-full transition-all " +
                                  (module.overallProgress === 100
                                    ? "bg-emerald-500"
                                    : accent.bar)
                                }
                                style={{
                                  width:
                                    module.overallProgress +
                                    "%",
                                }}
                              />
                            </div>
                          </div>

                          {/* Counts */}
                          <div className="mt-5 flex flex-wrap gap-2">
                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-600">
                              {module.lectureCompleted}/
                              {module.lectureTotal} lectures
                            </span>

                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-600">
                              {module.assignmentCompleted}/
                              {module.assignmentTotal}{" "}
                              assignments
                            </span>
                          </div>

                          <div className="mt-5 flex items-center justify-between">
                            <span className="text-sm font-semibold">
                              Open module
                            </span>

                            {module.overallProgress === 100 && (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                                Complete ✓
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}