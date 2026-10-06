"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";

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

type Filter = "all" | "todo" | "completed" | "overdue";

type CombinedItem = {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  completed: boolean;
  type: "assignment" | "task";
  moduleId?: string;
  moduleName?: string;
  moduleCode?: string | null;
};

export default function TasksPage() {
  const router = useRouter();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTasks() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please log in again.");
      setLoading(false);
      return;
    }

    const { data: assignmentData, error: assignmentError } =
      await supabase
        .from("assignments")
        .select(
          "id, module_id, title, description, due_date, completed, module:modules(name, code)"
        )
        .order("due_date", { ascending: true });

    if (assignmentError) {
      setError(assignmentError.message);
      setLoading(false);
      return;
    }

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("id, title, description, task_date, completed")
      .eq("user_id", user.id)
      .order("task_date", { ascending: true });

    if (taskError) {
      setError(taskError.message);
      setLoading(false);
      return;
    }

    setAssignments(
      (assignmentData || []) as unknown as Assignment[]
    );

    setTasks((taskData || []) as Task[]);
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function logActivity(
    type: string,
    title: string,
    description: string | null
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    await supabase.from("activity").insert({
      user_id: user.id,
      type: type,
      title: title,
      description: description,
      module_id: null,
    });
  }

  async function toggleAssignment(
    assignment: Assignment
  ) {
    setError("");

    const newCompletedState = !assignment.completed;

    const { error: updateError } = await supabase
      .from("assignments")
      .update({
        completed: newCompletedState,
      })
      .eq("id", assignment.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setAssignments((current) =>
      current.map((item) =>
        item.id === assignment.id
          ? {
              ...item,
              completed: newCompletedState,
            }
          : item
      )
    );

    await supabase.from("activity").insert({
      user_id: (
        await supabase.auth.getUser()
      ).data.user?.id,
      type: newCompletedState
        ? "assignment_completed"
        : "assignment_uncompleted",
      title: newCompletedState
        ? "Completed " + assignment.title
        : "Marked " + assignment.title + " as incomplete",
      description: null,
      module_id: assignment.module_id,
    });
  }

  async function toggleTask(task: Task) {
    setError("");

    const newCompletedState = !task.completed;

    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        completed: newCompletedState,
      })
      .eq("id", task.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              completed: newCompletedState,
            }
          : item
      )
    );

    await logActivity(
      newCompletedState
        ? "task_completed"
        : "task_uncompleted",
      newCompletedState
        ? "Completed " + task.title
        : "Marked " + task.title + " as incomplete",
      task.description
    );
  }

  async function deleteTask(task: Task) {
    const confirmed = window.confirm(
      "Delete " + task.title + "?"
    );

    if (!confirmed) {
      return;
    }

    setError("");

    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", task.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setTasks((current) =>
      current.filter((item) => item.id !== task.id)
    );

    await logActivity(
      "task_deleted",
      "Deleted " + task.title,
      task.description
    );
  }

  const combinedItems = useMemo<CombinedItem[]>(() => {
    const assignmentItems: CombinedItem[] =
      assignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        date: assignment.due_date,
        completed: assignment.completed,
        type: "assignment",
        moduleId: assignment.module_id,
        moduleName: assignment.module?.name,
        moduleCode: assignment.module?.code,
      }));

    const taskItems: CombinedItem[] =
      tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        date: task.task_date,
        completed: task.completed,
        type: "task",
      }));

    return [...assignmentItems, ...taskItems].sort(
      (a, b) => {
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
      }
    );
  }, [assignments, tasks]);

  function isOverdue(item: CombinedItem) {
    if (!item.date || item.completed) {
      return false;
    }

    return new Date(item.date).getTime() < Date.now();
  }

  const filteredItems = combinedItems.filter((item) => {
    if (filter === "todo") {
      return !item.completed;
    }

    if (filter === "completed") {
      return item.completed;
    }

    if (filter === "overdue") {
      return isOverdue(item);
    }

    return true;
  });

  const totalItems = combinedItems.length;
  const completedItems = combinedItems.filter(
    (item) => item.completed
  ).length;

  const pendingItems = combinedItems.filter(
    (item) => !item.completed
  ).length;

  const overdueItems = combinedItems.filter(
    (item) => isOverdue(item)
  ).length;

  function formatDate(date: string | null) {
    if (!date) {
      return "No date";
    }

    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(date: string | null) {
    if (!date) {
      return "";
    }

    return new Date(date).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] md:flex">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <div className="mb-8">
            <p className="text-sm font-medium text-black/40">
              UniFlow
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Tasks
            </h1>

            <p className="mt-2 text-black/50">
              Keep track of assignments and personal tasks in one place.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-sm text-black/40">
                Total
              </p>
              <p className="mt-2 text-3xl font-bold">
                {totalItems}
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-sm text-black/40">
                To do
              </p>
              <p className="mt-2 text-3xl font-bold">
                {pendingItems}
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-sm text-black/40">
                Completed
              </p>
              <p className="mt-2 text-3xl font-bold">
                {completedItems}
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-sm text-black/40">
                Overdue
              </p>
              <p className="mt-2 text-3xl font-bold">
                {overdueItems}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {[
              ["all", "All"],
              ["todo", "To do"],
              ["overdue", "Overdue"],
              ["completed", "Completed"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() =>
                  setFilter(value as Filter)
                }
                className={
                  "rounded-xl px-4 py-2 text-sm font-medium transition " +
                  (filter === value
                    ? "bg-black text-white"
                    : "border border-black/10 bg-white text-black/60 hover:bg-black/5")
                }
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <section className="mt-6">
            {loading ? (
              <div className="rounded-2xl border border-black/10 bg-white p-8 text-center">
                <p className="text-sm text-black/40">
                  Loading tasks...
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center">
                <p className="text-lg font-semibold">
                  Nothing here
                </p>

                <p className="mt-2 text-sm text-black/40">
                  {filter === "completed"
                    ? "You haven't completed anything yet."
                    : filter === "overdue"
                    ? "You have no overdue work."
                    : "Your tasks and assignments will appear here."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.type + "-" + item.id}
                    className={
                      "rounded-2xl border bg-white p-4 transition " +
                      (item.completed
                        ? "border-black/5 opacity-70"
                        : "border-black/10 hover:border-black/20 hover:shadow-sm")
                    }
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => {
                          if (item.type === "assignment") {
                            const assignment =
                              assignments.find(
                                (assignmentItem) =>
                                  assignmentItem.id === item.id
                              );

                            if (assignment) {
                              toggleAssignment(assignment);
                            }
                          } else {
                            const task = tasks.find(
                              (taskItem) =>
                                taskItem.id === item.id
                            );

                            if (task) {
                              toggleTask(task);
                            }
                          }
                        }}
                        className={
                          "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition " +
                          (item.completed
                            ? "border-black bg-black text-white"
                            : "border-black/20 hover:border-black/50")
                        }
                        aria-label={
                          item.completed
                            ? "Mark incomplete"
                            : "Mark complete"
                        }
                      >
                        {item.completed ? "✓" : ""}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={
                              "rounded-lg px-2 py-1 text-[11px] font-semibold " +
                              (item.type === "assignment"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-purple-50 text-purple-700")
                            }
                          >
                            {item.type === "assignment"
                              ? "Assignment"
                              : "Task"}
                          </span>

                          {isOverdue(item) && (
                            <span className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600">
                              Overdue
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (
                              item.type === "assignment" &&
                              item.moduleId
                            ) {
                              router.push(
                                "/modules/" +
                                  item.moduleId
                              );
                            }
                          }}
                          className={
                            "mt-2 text-left text-base font-semibold " +
                            (item.completed
                              ? "text-black/40 line-through"
                              : "text-black")
                          }
                        >
                          {item.title}
                        </button>

                        {item.description && (
                          <p className="mt-1 text-sm text-black/40">
                            {item.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/40">
                          {item.date && (
                            <span>
                              {formatDate(item.date)}
                              {" • "}
                              {formatTime(item.date)}
                            </span>
                          )}

                          {item.moduleName && (
                            <span>
                              {item.moduleName}
                              {item.moduleCode
                                ? " • " + item.moduleCode
                                : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {item.type === "task" && (
                        <button
                          onClick={() => {
                            const task = tasks.find(
                              (taskItem) =>
                                taskItem.id === item.id
                            );

                            if (task) {
                              deleteTask(task);
                            }
                          }}
                          className="shrink-0 rounded-lg px-2 py-1 text-xs text-black/30 transition hover:bg-red-50 hover:text-red-600"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}