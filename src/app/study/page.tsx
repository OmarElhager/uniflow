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

type Assignment = {
  id: string;
  module_id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  module?: {
    name: string;
    code: string | null;
  }[] | null;
};

type Lecture = {
  id: string;
  module_id: string;
  title: string;
  week: number | null;
  description: string | null;
  completed?: boolean;
};

function formatDate(date: string | null) {
  if (!date) {
    return "No date";
  }

  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function getDueLabel(date: string | null) {
  if (!date) {
    return "No deadline";
  }

  const dueDate = new Date(date);
  const today = new Date();

  const dueDay = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate()
  );

  const todayDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const difference =
    dueDay.getTime() - todayDay.getTime();

  const days = Math.round(
    difference / (1000 * 60 * 60 * 24)
  );

  if (days < 0) {
    return "Overdue";
  }

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "Tomorrow";
  }

  if (days <= 7) {
    return "In " + days + " days";
  }

  return formatDate(date);
}

export default function StudyPage() {
  const router = useRouter();

  const [modules, setModules] = useState<Module[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStudyData() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    const [
      modulesResult,
      assignmentsResult,
      lecturesResult,
    ] = await Promise.all([
      supabase
        .from("modules")
        .select("id, name, code, description")
        .order("created_at", {
          ascending: true,
        }),

      supabase
        .from("assignments")
        .select(
          "id, module_id, title, due_date, completed, module:modules(name, code)"
        )
        .order("due_date", {
          ascending: true,
          nullsFirst: false,
        }),

      supabase
        .from("lectures")
        .select(
          "id, module_id, title, week, description, completed"
        )
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (modulesResult.error) {
      setError(modulesResult.error.message);
      setLoading(false);
      return;
    }

    if (assignmentsResult.error) {
      setError(assignmentsResult.error.message);
      setLoading(false);
      return;
    }

    if (lecturesResult.error) {
      setError(lecturesResult.error.message);
      setLoading(false);
      return;
    }

    setModules(modulesResult.data || []);

    setAssignments(
      (assignmentsResult.data as Assignment[]) || []
    );

    setLectures(
      (lecturesResult.data as Lecture[]) || []
    );

    setLoading(false);
  }

  useEffect(() => {
    loadStudyData();
  }, []);

  const pendingAssignments = useMemo(() => {
    return assignments
      .filter((assignment) => !assignment.completed)
      .sort((a, b) => {
        if (!a.due_date) {
          return 1;
        }

        if (!b.due_date) {
          return -1;
        }

        return (
          new Date(a.due_date).getTime() -
          new Date(b.due_date).getTime()
        );
      });
  }, [assignments]);

  const recentLectures = lectures.slice(0, 6);

  const completedAssignments = assignments.filter(
    (assignment) => assignment.completed
  ).length;

  const completedLectures = lectures.filter(
    (lecture) => lecture.completed
  ).length;

  const assignmentProgress =
    assignments.length > 0
      ? Math.round(
          (completedAssignments / assignments.length) * 100
        )
      : 0;

  const lectureProgress =
    lectures.length > 0
      ? Math.round(
          (completedLectures / lectures.length) * 100
        )
      : 0;

  function openModule(moduleId: string) {
    router.push("/modules/" + moduleId);
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-black">
      <div className="flex min-h-screen">

        <Sidebar />

        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-10">

            <div className="mb-8 md:mb-10">
              <p className="text-sm font-medium text-black/40">
                Revision workspace
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                Study
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-black/50 sm:text-base">
                Everything you need to focus on your studies.
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                <span>{error}</span>

                <button
                  onClick={() => setError("")}
                  className="shrink-0 font-medium hover:text-red-800"
                >
                  ×
                </button>
              </div>
            )}

            {loading ? (
              <div className="space-y-6">

                <div className="grid gap-4 sm:grid-cols-3">
                  {Array.from({ length: 3 }).map(
                    (_, index) => (
                      <div
                        key={index}
                        className="h-28 animate-pulse rounded-3xl bg-white"
                      />
                    )
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map(
                    (_, index) => (
                      <div
                        key={index}
                        className="h-40 animate-pulse rounded-3xl bg-white"
                      />
                    )
                  )}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="h-80 animate-pulse rounded-3xl bg-white" />
                  <div className="h-80 animate-pulse rounded-3xl bg-white" />
                </div>

              </div>
            ) : (
              <div className="space-y-8">

                {/* STUDY OVERVIEW */}

                <section className="grid gap-4 sm:grid-cols-3">

                  <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-black/35">
                      Modules
                    </p>

                    <p className="mt-3 text-3xl font-bold">
                      {modules.length}
                    </p>

                    <p className="mt-1 text-sm text-black/40">
                      Active modules
                    </p>
                  </div>

                  <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-black/35">
                          Assignments
                        </p>

                        <p className="mt-3 text-3xl font-bold">
                          {completedAssignments}
                          <span className="text-lg text-black/25">
                            {" / " + assignments.length}
                          </span>
                        </p>
                      </div>

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/5 text-sm font-bold">
                        {assignmentProgress}%
                      </div>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5">
                      <div
                        className="h-full rounded-full bg-black transition-all"
                        style={{
                          width: assignmentProgress + "%",
                        }}
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-black/35">
                          Lectures
                        </p>

                        <p className="mt-3 text-3xl font-bold">
                          {completedLectures}
                          <span className="text-lg text-black/25">
                            {" / " + lectures.length}
                          </span>
                        </p>
                      </div>

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/5 text-sm font-bold">
                        {lectureProgress}%
                      </div>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5">
                      <div
                        className="h-full rounded-full bg-black transition-all"
                        style={{
                          width: lectureProgress + "%",
                        }}
                      />
                    </div>
                  </div>

                </section>

                {/* QUICK ACTIONS */}

                <section>
                  <h2 className="mb-4 text-xl font-bold">
                    Start studying
                  </h2>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    <button
                      onClick={() =>
                        router.push("/modules")
                      }
                      className="group rounded-3xl border border-black/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-black/20 hover:shadow-md sm:p-6"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
                        📚
                      </div>

                      <h3 className="mt-5 font-bold">
                        Browse modules
                      </h3>

                      <p className="mt-2 text-sm leading-5 text-black/40">
                        Find lectures and course material.
                      </p>

                      <p className="mt-4 text-xs font-semibold text-black/30 transition group-hover:text-black">
                        Open modules →
                      </p>
                    </button>

                    <button
                      onClick={() =>
                        router.push("/tasks")
                      }
                      className="group rounded-3xl border border-black/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-black/20 hover:shadow-md sm:p-6"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
                        📝
                      </div>

                      <h3 className="mt-5 font-bold">
                        Review tasks
                      </h3>

                      <p className="mt-2 text-sm leading-5 text-black/40">
                        See what needs to be completed.
                      </p>

                      <p className="mt-4 text-xs font-semibold text-black/30 transition group-hover:text-black">
                        View tasks →
                      </p>
                    </button>

                    <button
                      onClick={() =>
                        router.push("/calendar")
                      }
                      className="group rounded-3xl border border-black/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-black/20 hover:shadow-md sm:p-6"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
                        📅
                      </div>

                      <h3 className="mt-5 font-bold">
                        Check deadlines
                      </h3>

                      <p className="mt-2 text-sm leading-5 text-black/40">
                        Plan your study around deadlines.
                      </p>

                      <p className="mt-4 text-xs font-semibold text-black/30 transition group-hover:text-black">
                        Open calendar →
                      </p>
                    </button>

                    <div className="rounded-3xl border border-black/10 bg-black p-5 text-white shadow-sm sm:p-6">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black">
                        ✦
                      </div>

                      <h3 className="mt-5 font-bold">
                        UniFlow Plus
                      </h3>

                      <p className="mt-2 text-sm leading-5 text-white/50">
                        AI summaries, flashcards, quizzes and more.
                      </p>

                      <p className="mt-4 text-xs font-semibold text-white/40">
                        Coming later
                      </p>
                    </div>

                  </div>
                </section>

                {/* MODULES */}

                <section>
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">
                        Your modules
                      </h2>

                      <p className="mt-1 text-sm text-black/40">
                        Choose a module to start studying.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        router.push("/modules")
                      }
                      className="shrink-0 text-sm font-semibold hover:underline"
                    >
                      View all →
                    </button>
                  </div>

                  {modules.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-black/10 bg-white p-8 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black/5 text-lg">
                        📚
                      </div>

                      <p className="mt-4 font-semibold">
                        No modules yet
                      </p>

                      <p className="mx-auto mt-1 max-w-sm text-sm text-black/40">
                        Add your first module to start building your study workspace.
                      </p>

                      <button
                        onClick={() =>
                          router.push("/modules")
                        }
                        className="mt-5 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black/80"
                      >
                        Go to modules
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                      {modules.slice(0, 6).map(
                        (module) => (
                          <button
                            key={module.id}
                            onClick={() =>
                              openModule(module.id)
                            }
                            className="group rounded-3xl border border-black/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-black/20 hover:shadow-md"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-xs font-bold text-white">
                                {module.code
                                  ? module.code
                                      .slice(0, 2)
                                      .toUpperCase()
                                  : "M"}
                              </div>

                              <span className="text-black/20 transition group-hover:text-black">
                                →
                              </span>
                            </div>

                            <h3 className="mt-5 font-bold">
                              {module.name}
                            </h3>

                            {module.code && (
                              <p className="mt-1 text-xs font-medium text-black/40">
                                {module.code}
                              </p>
                            )}

                            <p className="mt-4 line-clamp-2 text-sm leading-5 text-black/40">
                              {module.description ||
                                "Open lectures and resources"}
                            </p>
                          </button>
                        )
                      )}

                    </div>
                  )}
                </section>

                {/* WORK + LECTURES */}

                <div className="grid gap-6 lg:grid-cols-2">

                  <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">

                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold">
                          What needs your attention
                        </h2>

                        <p className="mt-1 text-sm text-black/40">
                          Your upcoming unfinished work.
                        </p>
                      </div>

                      {pendingAssignments.length > 0 && (
                        <span className="rounded-full bg-black px-2.5 py-1 text-xs font-semibold text-white">
                          {pendingAssignments.length}
                        </span>
                      )}
                    </div>

                    {pendingAssignments.length === 0 ? (
                      <div className="rounded-2xl bg-black/[0.03] p-7 text-center">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/5">
                          ✓
                        </div>

                        <p className="mt-3 text-sm font-semibold">
                          Nothing urgent
                        </p>

                        <p className="mt-1 text-xs text-black/40">
                          You have no pending assignments.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingAssignments
                          .slice(0, 5)
                          .map((assignment) => {
                            const dueLabel =
                              getDueLabel(
                                assignment.due_date
                              );

                            const isOverdue =
                              dueLabel === "Overdue";

                            return (
                              <button
                                key={assignment.id}
                                onClick={() =>
                                  openModule(
                                    assignment.module_id
                                  )
                                }
                                className="w-full rounded-2xl border border-black/10 p-4 text-left transition hover:border-black/20 hover:bg-black/[0.02]"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">
                                      {assignment.title}
                                    </p>

                                    <p className="mt-1 truncate text-xs text-black/40">
                                      {assignment.module?.[0]?.code ||
                                        assignment.module?.[0]?.name ||
                                        "Module"}
                                    </p>
                                  </div>

                                  <span
                                    className={
                                      "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold " +
                                      (isOverdue
                                        ? "bg-red-50 text-red-600"
                                        : dueLabel ===
                                            "Today"
                                          ? "bg-black text-white"
                                          : "bg-black/5 text-black/50")
                                    }
                                  >
                                    {dueLabel}
                                  </span>
                                </div>

                                {assignment.due_date && (
                                  <p className="mt-3 text-[11px] text-black/30">
                                    Due{" "}
                                    {formatDate(
                                      assignment.due_date
                                    )}
                                  </p>
                                )}
                              </button>
                            );
                          })}

                        {pendingAssignments.length > 5 && (
                          <button
                            onClick={() =>
                              router.push("/tasks")
                            }
                            className="w-full rounded-xl py-2 text-sm font-semibold text-black/50 transition hover:bg-black/5 hover:text-black"
                          >
                            View all{" "}
                            {pendingAssignments.length}{" "}
                            pending assignments →
                          </button>
                        )}
                      </div>
                    )}
                  </section>

                  <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">

                    <div className="mb-5">
                      <h2 className="text-xl font-bold">
                        Recent lectures
                      </h2>

                      <p className="mt-1 text-sm text-black/40">
                        Jump back into your course material.
                      </p>
                    </div>

                    {recentLectures.length === 0 ? (
                      <div className="rounded-2xl bg-black/[0.03] p-7 text-center">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/5">
                          📖
                        </div>

                        <p className="mt-3 text-sm font-semibold">
                          No lectures yet
                        </p>

                        <p className="mt-1 text-xs text-black/40">
                          Add lectures from your module pages.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentLectures.map((lecture) => {
                          const module = modules.find(
                            (item) =>
                              item.id ===
                              lecture.module_id
                          );

                          return (
                            <button
                              key={lecture.id}
                              onClick={() =>
                                openModule(
                                  lecture.module_id
                                )
                              }
                              className="group w-full rounded-2xl border border-black/10 p-4 text-left transition hover:border-black/20 hover:bg-black/[0.02]"
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                                  📖
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-semibold">
                                      {lecture.title}
                                    </p>

                                    {lecture.completed && (
                                      <span className="shrink-0 text-xs font-bold text-green-600">
                                        ✓
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-1 truncate text-xs text-black/40">
                                    {module?.code ||
                                      module?.name ||
                                      "Module"}

                                    {lecture.week
                                      ? " • Week " +
                                        lecture.week
                                      : ""}
                                  </p>
                                </div>

                                <span className="text-black/20 transition group-hover:text-black">
                                  →
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                  </section>

                </div>

              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}