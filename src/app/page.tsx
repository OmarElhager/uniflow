"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/Sidebar";
import { supabase } from "./lib/supabase";

type Profile = {
  full_name: string | null;
  university: string | null;
  degree: string | null;
  year_of_study: number | null;
};

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
  completed: boolean;
  created_at: string;
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
  } | null;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  task_date: string;
  completed: boolean;
};

type Activity = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  module_id: string | null;
  created_at: string;
  module?: {
    name: string;
    code: string | null;
  } | null;
};

type ModuleProgress = Module & {
  lectureTotal: number;
  lectureCompleted: number;
  assignmentTotal: number;
  assignmentCompleted: number;
  lectureProgress: number;
  assignmentProgress: number;
  overallProgress: number;
};

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [moduleCode, setModuleCode] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [savingModule, setSavingModule] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const [
        { data: profileData, error: profileError },
        { data: moduleData, error: moduleError },
        { data: lectureData, error: lectureError },
        { data: assignmentData, error: assignmentError },
        { data: taskData, error: taskError },
        { data: activityData, error: activityError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, university, degree, year_of_study")
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("modules")
          .select("id, name, code, description")
          .order("name", { ascending: true }),

        supabase
          .from("lectures")
          .select("id, module_id, title, completed, created_at")
          .order("created_at", { ascending: false }),

        supabase
          .from("assignments")
          .select(
            "id, module_id, title, due_date, completed, module:modules(name, code)"
          )
          .order("due_date", { ascending: true }),

        supabase
          .from("tasks")
          .select("id, title, description, task_date, completed")
          .order("task_date", { ascending: true }),

        supabase
          .from("activity")
          .select(
            "id, type, title, description, module_id, created_at, module:modules(name, code)"
          )
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      if (profileError) {
        setError(profileError.message);
      } else {
        setProfile(profileData);
      }

      if (moduleError) {
        setError(moduleError.message);
      } else {
        setModules(moduleData || []);
      }

      if (lectureError) {
        setError(lectureError.message);
      } else {
        setLectures(lectureData || []);
      }

      if (assignmentError) {
        setError(assignmentError.message);
      } else {
        setAssignments(
          (assignmentData || []) as unknown as Assignment[]
        );
      }

      if (taskError) {
        setError(taskError.message);
      } else {
        setTasks(taskData || []);
      }

      if (activityError) {
        setError(activityError.message);
      } else {
        setActivities(
          (activityData || []) as unknown as Activity[]
        );
      }

      setLoading(false);
    } catch {
      setError("Something went wrong while loading the dashboard.");
      setLoading(false);
    }
  }

  const moduleProgress = useMemo<ModuleProgress[]>(() => {
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
              (assignmentCompleted / moduleAssignments.length) * 100
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
        lectureProgress,
        assignmentProgress,
        overallProgress,
      };
    });
  }, [modules, lectures, assignments]);

  const pendingAssignments = useMemo(() => {
    return assignments.filter((assignment) => !assignment.completed);
  }, [assignments]);

  const pendingTasks = useMemo(() => {
    return tasks.filter((task) => !task.completed);
  }, [tasks]);

  const pendingWork = useMemo(() => {
    const assignmentItems = pendingAssignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      date: assignment.due_date,
      type: "Assignment",
      moduleName: assignment.module?.name || "Module",
      moduleId: assignment.module_id,
      completed: assignment.completed,
    }));

    const taskItems = pendingTasks.map((task) => ({
      id: task.id,
      title: task.title,
      date: task.task_date,
      type: "Task",
      moduleName: "Personal task",
      moduleId: "",
      completed: task.completed,
    }));

    return [...assignmentItems, ...taskItems]
      .sort((a, b) => {
        if (!a.date) {
          return 1;
        }

        if (!b.date) {
          return -1;
        }

        return (
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
        );
      })
      .slice(0, 6);
  }, [pendingAssignments, pendingTasks]);

  const completedAssignments = assignments.filter(
    (assignment) => assignment.completed
  ).length;

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const totalCompleted = completedAssignments + completedTasks;
  const totalWork = assignments.length + tasks.length;

  const completionRate =
    totalWork > 0
      ? Math.round((totalCompleted / totalWork) * 100)
      : 0;

  const recentLectures = lectures.slice(0, 5);

  const today = new Date();

  const formattedDate = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const firstName =
    profile?.full_name?.trim().split(" ")[0] || "there";

  async function addModule(e: React.FormEvent) {
    e.preventDefault();

    if (!moduleName.trim()) {
      return;
    }

    setSavingModule(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in again.");
      setSavingModule(false);
      return;
    }

    const { data: newModule, error: insertError } =
      await supabase
        .from("modules")
        .insert({
          user_id: user.id,
          name: moduleName.trim(),
          code: moduleCode.trim() || null,
          description: moduleDescription.trim() || null,
        })
        .select("id, name")
        .single();

    if (insertError) {
      setError(insertError.message);
      setSavingModule(false);
      return;
    }

    await supabase.from("activity").insert({
      user_id: user.id,
      type: "module_added",
      title: "Added " + moduleName.trim(),
      description: moduleDescription.trim() || null,
      module_id: newModule?.id || null,
    });

    setModuleName("");
    setModuleCode("");
    setModuleDescription("");
    setShowModuleModal(false);

    await loadDashboard();

    setSavingModule(false);
  }

  function getDueText(date: string | null) {
    if (!date) {
      return "No deadline";
    }

    const due = new Date(date);
    const now = new Date();

    const difference = due.getTime() - now.getTime();

    const days = Math.ceil(
      difference / (1000 * 60 * 60 * 24)
    );

    if (difference < 0) {
      return "Overdue";
    }

    if (days <= 1) {
      return "Today";
    }

    if (days === 2) {
      return "Tomorrow";
    }

    return "In " + (days - 1) + " days";
  }

  function getActivityTime(date: string) {
    const created = new Date(date);
    const now = new Date();

    const difference =
      now.getTime() - created.getTime();

    const minutes = Math.floor(
      difference / (1000 * 60)
    );

    const hours = Math.floor(
      difference / (1000 * 60 * 60)
    );

    const days = Math.floor(
      difference / (1000 * 60 * 60 * 24)
    );

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes < 60) {
      return minutes + "m ago";
    }

    if (hours < 24) {
      return hours + "h ago";
    }

    if (days === 1) {
      return "Yesterday";
    }

    if (days < 7) {
      return days + "d ago";
    }

    return created.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  }

  function getActivityIcon(type: string) {
    if (
      type === "lecture_completed" ||
      type === "assignment_completed" ||
      type === "task_completed"
    ) {
      return "✓";
    }

    if (
      type === "lecture_uncompleted" ||
      type === "assignment_uncompleted" ||
      type === "task_uncompleted"
    ) {
      return "↩";
    }

    if (
      type === "module_added" ||
      type === "assignment_added"
    ) {
      return "+";
    }

    if (
      type === "lecture_updated" ||
      type === "assignment_updated" ||
      type === "module_updated"
    ) {
      return "✎";
    }

    if (
      type === "lecture_deleted" ||
      type === "assignment_deleted" ||
      type === "task_deleted"
    ) {
      return "×";
    }

    return "•";
  }

  function getActivityIconStyle(type: string) {
    if (
      type === "lecture_completed" ||
      type === "assignment_completed" ||
      type === "task_completed"
    ) {
      return "bg-[#eaf8f1] text-[#18845a]";
    }

    if (
      type === "lecture_uncompleted" ||
      type === "assignment_uncompleted" ||
      type === "task_uncompleted"
    ) {
      return "bg-[#fff6df] text-[#b87500]";
    }

    if (
      type === "module_added" ||
      type === "assignment_added"
    ) {
      return "bg-[#eef3ff] text-[#315edc]";
    }

    if (
      type === "lecture_updated" ||
      type === "assignment_updated" ||
      type === "module_updated"
    ) {
      return "bg-[#f3efff] text-[#7650d8]";
    }

    if (
      type === "lecture_deleted" ||
      type === "assignment_deleted" ||
      type === "task_deleted"
    ) {
      return "bg-[#fff0f0] text-[#d44949]";
    }

    return "bg-black/5 text-black/50";
  }

  function getActivityDestination(activity: Activity) {
    if (activity.module_id) {
      return "/modules/" + activity.module_id;
    }

    if (
      activity.type === "task_completed" ||
      activity.type === "task_uncompleted" ||
      activity.type === "task_deleted"
    ) {
      return "/tasks";
    }

    return "";
  }

  function getActivityActionText(activity: Activity) {
    const destination = getActivityDestination(activity);

    if (!destination) {
      return "";
    }

    if (
      activity.type === "task_completed" ||
      activity.type === "task_uncompleted" ||
      activity.type === "task_deleted"
    ) {
      return "View tasks →";
    }

    return "Open module →";
  }

  function handleActivityClick(activity: Activity) {
    const destination = getActivityDestination(activity);

    if (destination) {
      router.push(destination);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#f7f8fc]">
        <Sidebar />

        <main className="flex-1 p-6 md:p-10">
          <div className="mx-auto max-w-7xl">
            <div className="h-8 w-48 animate-pulse rounded bg-black/10" />

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-2xl bg-white"
                />
              ))}
            </div>

            <div className="mt-8 h-64 animate-pulse rounded-3xl bg-white" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f7f8fc]">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl p-5 md:p-8 lg:p-10">

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-100 bg-[#fff0f0] px-4 py-3 text-sm text-[#d44949]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs">
                !
              </span>

              <span>{error}</span>
            </div>
          )}

          {/* HERO */}

          <section className="relative overflow-hidden rounded-3xl bg-[#1d2433] p-6 text-white shadow-sm md:p-8">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#4f7cff]/20 blur-3xl" />

            <div className="absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-[#8b5cf6]/15 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#4f7cff]" />

                  <p className="text-sm text-white/50">
                    {formattedDate}
                  </p>
                </div>

                <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                  Good day, {firstName}.
                </h1>

                <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
                  Everything you need for university, organised
                  in one place.
                </p>
              </div>

              <button
                onClick={() => setShowModuleModal(true)}
                className="rounded-xl bg-[#4f7cff] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#416ee8] hover:-translate-y-0.5"
              >
                + Add module
              </button>
            </div>
          </section>

          {/* STATS */}

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-2xl border border-[#dfe6ff] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-black/40">
                  Modules
                </p>

                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eef3ff] text-sm">
                  📚
                </span>
              </div>

              <p className="mt-3 text-3xl font-bold">
                {modules.length}
              </p>

              <p className="mt-1 text-xs text-black/35">
                Active modules
              </p>
            </div>

            <div className="rounded-2xl border border-[#f4e7c4] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-black/40">
                  Assignments
                </p>

                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff6df] text-sm">
                  📝
                </span>
              </div>

              <p className="mt-3 text-3xl font-bold">
                {pendingAssignments.length}
              </p>

              <p className="mt-1 text-xs text-black/35">
                Still to complete
              </p>
            </div>

            <div className="rounded-2xl border border-[#d9efe5] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-black/40">
                  Tasks
                </p>

                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eaf8f1] text-sm">
                  ✓
                </span>
              </div>

              <p className="mt-3 text-3xl font-bold">
                {pendingTasks.length}
              </p>

              <p className="mt-1 text-xs text-black/35">
                Personal tasks
              </p>
            </div>

            <div className="rounded-2xl border border-[#e6defc] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-black/40">
                  Completion
                </p>

                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f3efff] text-sm">
                  ✦
                </span>
              </div>

              <p className="mt-3 text-3xl font-bold">
                {completionRate}%
              </p>

              <p className="mt-1 text-xs text-black/35">
                Assignments + tasks
              </p>
            </div>

          </section>

          {/* MODULES */}

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Your modules
                </h2>

                <p className="mt-1 text-sm text-black/40">
                  Track your progress across each module.
                </p>
              </div>

              <button
                onClick={() => router.push("/modules")}
                className="text-xs font-semibold text-[#315edc] hover:text-[#244bb9]"
              >
                View all →
              </button>
            </div>

            {moduleProgress.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#cbd6f5] bg-white p-8 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef3ff] text-lg">
                  📚
                </div>

                <p className="mt-3 text-sm font-medium text-black/50">
                  No modules yet
                </p>

                <p className="mt-1 text-xs text-black/35">
                  Add your first module to start organising
                  university.
                </p>

                <button
                  onClick={() => setShowModuleModal(true)}
                  className="mt-4 rounded-xl bg-[#4f7cff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#416ee8]"
                >
                  Add module
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {moduleProgress.slice(0, 6).map((module) => (
                  <button
                    key={module.id}
                    onClick={() =>
                      router.push("/modules/" + module.id)
                    }
                    className="group rounded-2xl border border-black/5 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#cbd6f5] hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-[#4f7cff]" />

                          <p className="truncate text-sm font-bold">
                            {module.name}
                          </p>
                        </div>

                        <p className="mt-1 text-xs text-black/40">
                          {module.code || "No module code"}
                        </p>
                      </div>

                      <span
                        className={
                          "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold " +
                          (module.overallProgress === 100
                            ? "bg-[#eaf8f1] text-[#18845a]"
                            : "bg-[#eef3ff] text-[#315edc]")
                        }
                      >
                        {module.overallProgress}%
                      </span>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex justify-between text-[11px] text-black/35">
                        <span>Overall progress</span>

                        <span>
                          {module.lectureCompleted +
                            module.assignmentCompleted}{" "}
                          /{" "}
                          {module.lectureTotal +
                            module.assignmentTotal}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-[#edf0f5]">
                        <div
                          className={
                            "h-full rounded-full transition-all " +
                            (module.overallProgress === 100
                              ? "bg-[#22a06b]"
                              : "bg-[#4f7cff]")
                          }
                          style={{
                            width: module.overallProgress + "%",
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex gap-4 text-[11px] text-black/40">
                      <span>
                        Lectures {module.lectureCompleted}/
                        {module.lectureTotal}
                      </span>

                      <span>
                        Assignments{" "}
                        {module.assignmentCompleted}/
                        {module.assignmentTotal}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* UPCOMING */}

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Upcoming
                </h2>

                <p className="mt-1 text-sm text-black/40">
                  Your next pieces of work.
                </p>
              </div>

              <button
                onClick={() => router.push("/tasks")}
                className="text-xs font-semibold text-[#315edc] hover:text-[#244bb9]"
              >
                View tasks →
              </button>
            </div>

            {pendingWork.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#cfe9dc] bg-white p-8 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#eaf8f1] text-[#18845a]">
                  ✓
                </div>

                <p className="mt-3 text-sm font-medium text-black/50">
                  You're all caught up
                </p>

                <p className="mt-1 text-xs text-black/35">
                  No unfinished assignments or personal tasks.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {pendingWork.map((item) => (
                  <button
                    key={item.type + "-" + item.id}
                    onClick={() => {
                      if (item.moduleId) {
                        router.push(
                          "/modules/" + item.moduleId
                        );
                      } else {
                        router.push("/tasks");
                      }
                    }}
                    className="rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-black/10 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={
                          "rounded-full px-2.5 py-1 text-[10px] font-bold " +
                          (item.type === "Assignment"
                            ? "bg-[#fff6df] text-[#b87500]"
                            : "bg-[#eef3ff] text-[#315edc]")
                        }
                      >
                        {item.type}
                      </span>

                      <span
                        className={
                          "text-[10px] font-semibold " +
                          (getDueText(item.date) === "Overdue"
                            ? "text-[#d44949]"
                            : getDueText(item.date) ===
                                "Today"
                              ? "text-[#b87500]"
                              : "text-black/35")
                        }
                      >
                        {getDueText(item.date)}
                      </span>
                    </div>

                    <h3 className="mt-4 truncate text-sm font-semibold">
                      {item.title}
                    </h3>

                    <p className="mt-1 truncate text-xs text-black/40">
                      {item.moduleName}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ACTIVITY */}

          <section className="mt-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold">
                Recent activity
              </h2>

              <p className="mt-1 text-sm text-black/40">
                Everything you've recently changed.
              </p>
            </div>

            {activities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center">
                <p className="text-sm font-medium text-black/50">
                  No activity yet
                </p>

                <p className="mt-1 text-xs text-black/35">
                  Your recent actions will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                {activities.map((activity, index) => {
                  const destination =
                    getActivityDestination(activity);

                  return (
                    <button
                      key={activity.id}
                      onClick={() =>
                        handleActivityClick(activity)
                      }
                      disabled={!destination}
                      className={
                        "flex w-full items-center gap-4 p-4 text-left transition " +
                        (index !== activities.length - 1
                          ? "border-b border-black/5 "
                          : "") +
                        (destination
                          ? "hover:bg-black/[0.02]"
                          : "cursor-default")
                      }
                    >
                      <div
                        className={
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold " +
                          getActivityIconStyle(
                            activity.type
                          )
                        }
                      >
                        {getActivityIcon(activity.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {activity.title}
                        </p>

                        {activity.description && (
                          <p className="mt-1 truncate text-xs text-black/40">
                            {activity.description}
                          </p>
                        )}

                        {activity.module?.name && (
                          <p className="mt-1 truncate text-[11px] text-black/30">
                            {activity.module.code
                              ? activity.module.code + " · "
                              : ""}
                            {activity.module.name}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-xs text-black/30">
                          {getActivityTime(
                            activity.created_at
                          )}
                        </span>

                        {destination && (
                          <span className="text-[11px] font-medium text-[#315edc]">
                            {getActivityActionText(
                              activity
                            )}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* RECENT LECTURES */}

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Recent lectures
                </h2>

                <p className="mt-1 text-sm text-black/40">
                  Continue where you left off.
                </p>
              </div>

              <button
                onClick={() => router.push("/study")}
                className="text-xs font-semibold text-[#7650d8] hover:text-[#6440bd]"
              >
                Study →
              </button>
            </div>

            {recentLectures.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3efff] text-lg">
                  📖
                </div>

                <p className="mt-3 text-sm font-medium text-black/50">
                  No lectures yet
                </p>

                <p className="mt-1 text-xs text-black/35">
                  Add lectures inside your modules.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {recentLectures.map((lecture) => {
                  const module = modules.find(
                    (item) =>
                      item.id === lecture.module_id
                  );

                  return (
                    <button
                      key={lecture.id}
                      onClick={() =>
                        router.push(
                          "/modules/" + lecture.module_id
                        )
                      }
                      className="group rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#e0d8fa] hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-[#f3efff] px-2.5 py-1 text-[10px] font-bold text-[#7650d8]">
                          Lecture
                        </span>

                        {lecture.completed && (
                          <span className="rounded-full bg-[#eaf8f1] px-2.5 py-1 text-[10px] font-semibold text-[#18845a]">
                            ✓ Completed
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 truncate text-sm font-semibold">
                        {lecture.title}
                      </h3>

                      <p className="mt-1 truncate text-xs text-black/40">
                        {module?.name || "Module"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* QUICK ACTIONS */}

          <section className="mt-8">
            <div className="rounded-3xl border border-[#dfe6ff] bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#315edc]">
                    Quick actions
                  </p>

                  <h2 className="mt-2 text-lg font-bold">
                    Keep UniFlow up to date
                  </h2>

                  <p className="mt-1 text-sm text-black/40">
                    Add modules, plan your work and track your
                    progress.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowModuleModal(true)}
                    className="rounded-xl bg-[#4f7cff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#416ee8]"
                  >
                    Add module
                  </button>

                  <button
                    onClick={() => router.push("/calendar")}
                    className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:border-[#cbd6f5] hover:bg-[#eef3ff] hover:text-[#315edc]"
                  >
                    Open calendar
                  </button>

                  <button
                    onClick={() => router.push("/study")}
                    className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:border-[#e0d8fa] hover:bg-[#f3efff] hover:text-[#7650d8]"
                  >
                    Study
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* PROFILE */}

          {profile && (
            <section className="mt-8">
              <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/35">
                  Student profile
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-black/35">
                      Name
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {profile.full_name || "Not set"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-black/35">
                      University
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {profile.university || "Not set"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-black/35">
                      Degree
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {profile.degree || "Not set"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-black/35">
                      Year
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {profile.year_of_study || "Not set"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

        </div>
      </main>

      {/* ADD MODULE MODAL */}

      {showModuleModal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowModuleModal(false);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-3xl border border-black/5 bg-white p-6 shadow-2xl">
            <div className="mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3ff] text-[#315edc]">
                +
              </div>

              <h2 className="mt-4 text-xl font-bold">
                Add module
              </h2>

              <p className="mt-1 text-sm text-black/40">
                Add a new university module.
              </p>
            </div>

            <form onSubmit={addModule} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Module name
                </label>

                <input
                  required
                  value={moduleName}
                  onChange={(e) =>
                    setModuleName(e.target.value)
                  }
                  placeholder="e.g. Engineering Mathematics"
                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#4f7cff]/50 focus:ring-4 focus:ring-[#4f7cff]/5"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Module code
                </label>

                <input
                  value={moduleCode}
                  onChange={(e) =>
                    setModuleCode(e.target.value)
                  }
                  placeholder="e.g. ME101"
                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#4f7cff]/50 focus:ring-4 focus:ring-[#4f7cff]/5"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  value={moduleDescription}
                  onChange={(e) =>
                    setModuleDescription(e.target.value)
                  }
                  placeholder="Optional description"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#4f7cff]/50 focus:ring-4 focus:ring-[#4f7cff]/5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowModuleModal(false)
                  }
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-black/50 hover:bg-black/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingModule}
                  className="rounded-xl bg-[#4f7cff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#416ee8] disabled:opacity-50"
                >
                  {savingModule
                    ? "Adding..."
                    : "Add module"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}