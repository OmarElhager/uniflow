"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";

type Module = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
};

type Lecture = {
  id: string;
  module_id: string;
  title: string;
  week: number | null;
  description: string | null;
  file_url: string | null;
  module?: {
    name: string;
    code: string | null;
  } | null;
};

type Assignment = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  module?: {
    name: string;
    code: string | null;
  } | null;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  task_date: string;
  completed: boolean;
};

type SearchResult = {
  id: string;
  title: string;
  description: string | null;
  type: "module" | "lecture" | "assignment" | "task";
  moduleId?: string;
  moduleName?: string;
  moduleCode?: string | null;
  date?: string | null;
  hasFile?: boolean;
  completed?: boolean;
};

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState(query);
  const [modules, setModules] = useState<Module[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    loadSearchData();
  }, []);

  async function loadSearchData() {
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

      const [
        { data: moduleData, error: moduleError },
        { data: lectureData, error: lectureError },
        { data: assignmentData, error: assignmentError },
        { data: taskData, error: taskError },
      ] = await Promise.all([
        supabase
          .from("modules")
          .select("id, name, code, description")
          .order("name", { ascending: true }),

        supabase
          .from("lectures")
          .select(
            "id, module_id, title, week, description, file_url, module:modules(name, code)"
          )
          .order("title", { ascending: true }),

        supabase
          .from("assignments")
          .select(
            "id, module_id, title, description, due_date, completed, module:modules(name, code)"
          )
          .order("due_date", { ascending: true }),

        supabase
          .from("tasks")
          .select("id, title, description, task_date, completed")
          .order("task_date", { ascending: true }),
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

      if (taskError) {
        setError(taskError.message);
        setLoading(false);
        return;
      }

      setModules(moduleData || []);
      setLectures((lectureData || []) as unknown as Lecture[]);
      setAssignments(
        (assignmentData || []) as unknown as Assignment[]
      );
      setTasks(taskData || []);
    } catch {
      setError("Something went wrong while loading search.");
    }

    setLoading(false);
  }

  const results = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) {
      return [];
    }

    const resultList: SearchResult[] = [];

    modules.forEach((module) => {
      const searchableText = [
        module.name,
        module.code || "",
        module.description || "",
      ]
        .join(" ")
        .toLowerCase();

      if (searchableText.includes(cleanQuery)) {
        resultList.push({
          id: module.id,
          title: module.name,
          description: module.description,
          type: "module",
          moduleId: module.id,
          moduleName: module.name,
          moduleCode: module.code,
        });
      }
    });

    lectures.forEach((lecture) => {
      const searchableText = [
        lecture.title,
        lecture.description || "",
        lecture.module?.name || "",
        lecture.module?.code || "",
        lecture.week ? "week " + lecture.week : "",
      ]
        .join(" ")
        .toLowerCase();

      if (searchableText.includes(cleanQuery)) {
        resultList.push({
          id: lecture.id,
          title: lecture.title,
          description: lecture.description,
          type: "lecture",
          moduleId: lecture.module_id,
          moduleName: lecture.module?.name,
          moduleCode: lecture.module?.code,
          hasFile: Boolean(lecture.file_url),
        });
      }
    });

    assignments.forEach((assignment) => {
      const searchableText = [
        assignment.title,
        assignment.description || "",
        assignment.module?.name || "",
        assignment.module?.code || "",
      ]
        .join(" ")
        .toLowerCase();

      if (searchableText.includes(cleanQuery)) {
        resultList.push({
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          type: "assignment",
          moduleId: assignment.module_id,
          moduleName: assignment.module?.name,
          moduleCode: assignment.module?.code,
          date: assignment.due_date,
          completed: assignment.completed,
        });
      }
    });

    tasks.forEach((task) => {
      const searchableText = [
        task.title,
        task.description || "",
      ]
        .join(" ")
        .toLowerCase();

      if (searchableText.includes(cleanQuery)) {
        resultList.push({
          id: task.id,
          title: task.title,
          description: task.description,
          type: "task",
          date: task.task_date,
          completed: task.completed,
        });
      }
    });

    return resultList;
  }, [query, modules, lectures, assignments, tasks]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    const cleanQuery = searchInput.trim();

    if (!cleanQuery) {
      router.push("/search");
      return;
    }

    router.push("/search?q=" + encodeURIComponent(cleanQuery));
  }

  function openResult(result: SearchResult) {
    if (
      result.type === "module" ||
      result.type === "lecture" ||
      result.type === "assignment"
    ) {
      router.push("/modules/" + result.moduleId);
      return;
    }

    router.push("/tasks");
  }

  function getTypeLabel(type: SearchResult["type"]) {
    if (type === "module") {
      return "Module";
    }

    if (type === "lecture") {
      return "Lecture";
    }

    if (type === "assignment") {
      return "Assignment";
    }

    return "Task";
  }

  function getTypeStyle(type: SearchResult["type"]) {
    if (type === "module") {
      return "bg-blue-50 text-blue-700 ring-blue-100";
    }

    if (type === "lecture") {
      return "bg-violet-50 text-violet-700 ring-violet-100";
    }

    if (type === "assignment") {
      return "bg-orange-50 text-orange-700 ring-orange-100";
    }

    return "bg-cyan-50 text-cyan-700 ring-cyan-100";
  }

  function getAccentStyle(type: SearchResult["type"]) {
    if (type === "module") {
      return "bg-blue-500";
    }

    if (type === "lecture") {
      return "bg-violet-500";
    }

    if (type === "assignment") {
      return "bg-orange-500";
    }

    return "bg-cyan-500";
  }

  function formatDate(date: string | null | undefined) {
    if (!date) {
      return "";
    }

    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <main className="flex min-h-screen bg-[#f7f7f5]">
      <Sidebar />

      <section className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10">
          <div className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              UniFlow Search
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Search
            </h1>

            <p className="mt-2 text-black/50">
              Find anything across your university workspace.
            </p>
          </div>

          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative">
              <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-lg text-black/30">
                🔎
              </span>

              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search thermodynamics, assignments, lectures..."
                autoFocus
                className="w-full rounded-2xl border border-black/10 bg-white py-4 pl-12 pr-28 text-base shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
              />

              <button
                type="submit"
                className="absolute right-2 top-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Search
              </button>
            </div>
          </form>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {!query && !loading && (
            <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
              <div className="h-1 bg-blue-500" />

              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                  🔎
                </div>

                <h2 className="mt-5 text-xl font-semibold">
                  Search your university
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/45">
                  Find modules, lectures, assignments and personal tasks from
                  one place.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                    Modules
                  </span>

                  <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
                    Lectures
                  </span>

                  <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700">
                    Assignments
                  </span>

                  <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700">
                    Tasks
                  </span>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
              <div className="h-1 bg-blue-500" />

              <div className="p-8 text-center text-sm text-black/50">
                Searching your UniFlow data...
              </div>
            </div>
          )}

          {!loading && query && (
            <>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-black/45">
                    Search results for
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    “{query}”
                  </h2>
                </div>

                <div className="w-fit rounded-full border border-black/5 bg-white px-4 py-2 text-sm font-medium text-black/50 shadow-sm">
                  {results.length} result
                  {results.length === 1 ? "" : "s"}
                </div>
              </div>

              {results.length === 0 && (
                <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
                  <div className="h-1 bg-orange-400" />

                  <div className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl">
                      ⌕
                    </div>

                    <h2 className="mt-4 text-xl font-semibold">
                      No results found
                    </h2>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/45">
                      Try a different keyword, module name, lecture title or
                      assignment.
                    </p>
                  </div>
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-3">
                  {results.map((result) => (
                    <button
                      key={result.type + "-" + result.id}
                      onClick={() => openResult(result)}
                      className="group relative w-full overflow-hidden rounded-2xl border border-black/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-black/15 hover:shadow-md"
                    >
                      <div
                        className={
                          "absolute bottom-0 left-0 top-0 w-1 " +
                          getAccentStyle(result.type)
                        }
                      />

                      <div className="pl-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span
                                className={
                                  "rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset " +
                                  getTypeStyle(result.type)
                                }
                              >
                                {getTypeLabel(result.type)}
                              </span>

                              {result.moduleCode && (
                                <span className="text-xs font-medium text-black/35">
                                  {result.moduleCode}
                                </span>
                              )}

                              {result.hasFile && (
                                <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-medium text-violet-600">
                                  📄 PDF
                                </span>
                              )}

                              {result.completed && (
                                <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                                  ✓ Completed
                                </span>
                              )}
                            </div>

                            <h3 className="truncate text-base font-semibold transition group-hover:text-blue-700">
                              {result.title}
                            </h3>

                            {result.moduleName &&
                              result.type !== "module" && (
                                <p className="mt-1 text-sm text-black/45">
                                  {result.moduleName}
                                </p>
                              )}

                            {result.description && (
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-black/50">
                                {result.description}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 text-lg text-black/20 transition group-hover:translate-x-1 group-hover:text-blue-500">
                            →
                          </div>
                        </div>

                        {result.date && (
                          <div className="mt-4 border-t border-black/5 pt-3 text-xs text-black/40">
                            {result.type === "assignment"
                              ? "Due "
                              : "Scheduled "}
                            {formatDate(result.date)}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen bg-[#f7f7f5]">
          <Sidebar />

          <section className="min-w-0 flex-1">
            <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-10">
              <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
                <div className="h-1 bg-blue-500" />

                <div className="p-8 text-center text-sm text-black/50">
                  Loading search...
                </div>
              </div>
            </div>
          </section>
        </main>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}