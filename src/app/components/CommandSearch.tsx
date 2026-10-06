"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  description: string | null;
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
  module?: {
    name: string;
    code: string | null;
  } | null;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
};

type SearchResult = {
  id: string;
  title: string;
  description: string | null;
  type: "module" | "lecture" | "assignment" | "task";
  moduleId?: string;
  moduleName?: string;
  moduleCode?: string | null;
};

export default function CommandSearch() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [modules, setModules] = useState<Module[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setOpen(true);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open || loaded) {
      return;
    }

    loadData();
  }, [open, loaded]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(() => {
      const input = document.getElementById("uniflow-command-search");

      if (input) {
        input.focus();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [open]);

  async function loadData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const [
        { data: moduleData },
        { data: lectureData },
        { data: assignmentData },
        { data: taskData },
      ] = await Promise.all([
        supabase
          .from("modules")
          .select("id, name, code, description")
          .order("name", { ascending: true }),

        supabase
          .from("lectures")
          .select(
            "id, module_id, title, description, module:modules(name, code)"
          )
          .order("title", { ascending: true }),

        supabase
          .from("assignments")
          .select(
            "id, module_id, title, description, module:modules(name, code)"
          )
          .order("title", { ascending: true }),

        supabase
          .from("tasks")
          .select("id, title, description")
          .order("title", { ascending: true }),
      ]);

      setModules(moduleData || []);
      setLectures((lectureData || []) as unknown as Lecture[]);
      setAssignments(
        (assignmentData || []) as unknown as Assignment[]
      );
      setTasks(taskData || []);

      setLoaded(true);
    } catch {
      setLoaded(true);
    }
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
        });
      }
    });

    return resultList.slice(0, 8);
  }, [query, modules, lectures, assignments, tasks]);

  function openResult(result: SearchResult) {
    setOpen(false);
    setQuery("");

    if (result.type === "task") {
      router.push("/tasks");
      return;
    }

    router.push("/modules/" + result.moduleId);
  }

  function openFullSearch() {
    const cleanQuery = query.trim();

    setOpen(false);

    if (!cleanQuery) {
      router.push("/search");
      return;
    }

    router.push("/search?q=" + encodeURIComponent(cleanQuery));
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
      return "bg-blue-50 text-blue-700";
    }

    if (type === "lecture") {
      return "bg-purple-50 text-purple-700";
    }

    if (type === "assignment") {
      return "bg-orange-50 text-orange-700";
    }

    return "bg-green-50 text-green-700";
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 hidden items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-black/50 shadow-lg transition hover:border-black/20 hover:text-black md:flex"
      >
        <span>Search</span>
        <kbd className="rounded-md border border-black/10 bg-black/5 px-1.5 py-0.5 font-mono text-[10px]">
          Ctrl K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close search"
      />

      <div className="relative mx-auto mt-[12vh] w-[calc(100%-32px)] max-w-2xl">
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl">
          <div className="flex items-center border-b border-black/10 px-5">
            <span className="mr-3 text-lg text-black/35">
              🔎
            </span>

            <input
              id="uniflow-command-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search UniFlow..."
              className="min-w-0 flex-1 bg-transparent py-5 text-base outline-none"
            />

            <kbd className="rounded-lg border border-black/10 bg-black/5 px-2 py-1 font-mono text-[10px] text-black/40">
              ESC
            </kbd>
          </div>

          {!query.trim() && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-medium text-black/60">
                Search your university
              </p>

              <p className="mt-1 text-xs text-black/35">
                Find modules, lectures, assignments and tasks.
              </p>
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-black/60">
                No results found
              </p>

              <p className="mt-1 text-xs text-black/35">
                Try another keyword.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {results.map((result) => (
                <button
                  key={result.type + "-" + result.id}
                  onClick={() => openResult(result)}
                  className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-black/5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/5 text-sm">
                    {result.type === "module" && "▦"}
                    {result.type === "lecture" && "▤"}
                    {result.type === "assignment" && "✓"}
                    {result.type === "task" && "○"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {result.title}
                      </p>

                      <span
                        className={
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                          getTypeStyle(result.type)
                        }
                      >
                        {getTypeLabel(result.type)}
                      </span>
                    </div>

                    {result.moduleName && result.type !== "module" && (
                      <p className="mt-0.5 truncate text-xs text-black/40">
                        {result.moduleName}
                        {result.moduleCode
                          ? " • " + result.moduleCode
                          : ""}
                      </p>
                    )}
                  </div>

                  <span className="text-black/20 transition group-hover:translate-x-1 group-hover:text-black/50">
                    →
                  </span>
                </button>
              ))}

              <button
                onClick={openFullSearch}
                className="mt-1 w-full rounded-2xl border-t border-black/5 px-3 py-3 text-left text-xs font-medium text-black/45 transition hover:bg-black/5 hover:text-black"
              >
                View all search results →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}