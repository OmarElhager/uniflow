"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";

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

type Task = {
  id: string;
  title: string;
  description: string | null;
  task_date: string;
  completed: boolean;
};

function formatDateKey(date: Date) {
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CalendarPage() {
  const router = useRouter();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentDate, setCurrentDate] = useState(new Date());

  const [selectedDate, setSelectedDate] = useState(
    formatDateKey(new Date())
  );

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDate, setTaskDate] = useState(formatDateKey(new Date()));
  const [taskTime, setTaskTime] = useState("12:00");
  const [savingTask, setSavingTask] = useState(false);

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

  async function loadCalendarData() {
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

    const [assignmentResult, taskResult] = await Promise.all([
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
    ]);

    if (assignmentResult.error) {
      setError(assignmentResult.error.message);
      setLoading(false);
      return;
    }

    if (taskResult.error) {
      setError(taskResult.error.message);
      setLoading(false);
      return;
    }

    setAssignments((assignmentResult.data as Assignment[]) || []);
    setTasks((taskResult.data as Task[]) || []);

    setLoading(false);
  }

  useEffect(() => {
    loadCalendarData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const calendarDays: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const assignmentsByDate = useMemo(() => {
    const grouped: Record<string, Assignment[]> = {};

    assignments.forEach((assignment) => {
      if (!assignment.due_date) {
        return;
      }

      const date = new Date(assignment.due_date);
      const key = formatDateKey(date);

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(assignment);
    });

    return grouped;
  }, [assignments]);

  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    tasks.forEach((task) => {
      const date = new Date(task.task_date);
      const key = formatDateKey(date);

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(task);
    });

    return grouped;
  }, [tasks]);

  const selectedAssignments = assignmentsByDate[selectedDate] || [];
  const selectedTasks = tasksByDate[selectedDate] || [];

  const selectedDateObject = new Date(selectedDate + "T12:00:00");

  const selectedDateLabel = selectedDateObject.toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );

  const todayKey = formatDateKey(new Date());

  const selectedTotal =
    selectedAssignments.length + selectedTasks.length;

  const selectedCompleted =
    selectedAssignments.filter(
      (assignment) => assignment.completed
    ).length +
    selectedTasks.filter((task) => task.completed).length;

  const selectedProgress =
    selectedTotal > 0
      ? Math.round((selectedCompleted / selectedTotal) * 100)
      : 0;

  const monthAssignments = assignments.filter((assignment) => {
    if (!assignment.due_date) {
      return false;
    }

    const date = new Date(assignment.due_date);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month
    );
  });

  const monthTasks = tasks.filter((task) => {
    const date = new Date(task.task_date);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month
    );
  });

  const monthTotal =
    monthAssignments.length + monthTasks.length;

  const monthCompleted =
    monthAssignments.filter(
      (assignment) => assignment.completed
    ).length +
    monthTasks.filter((task) => task.completed).length;

  function previousMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function goToToday() {
    const today = new Date();

    setCurrentDate(
      new Date(today.getFullYear(), today.getMonth(), 1)
    );

    setSelectedDate(formatDateKey(today));
  }

  function openTaskModal(date?: string) {
    const dateToUse = date || selectedDate;

    setTaskDate(dateToUse);
    setTaskTitle("");
    setTaskDescription("");
    setTaskTime("12:00");
    setError("");
    setShowTaskModal(true);
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();

    if (!taskTitle.trim()) {
      return;
    }

    setSavingTask(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in again.");
      setSavingTask(false);
      return;
    }

    const taskDateTime = taskDate + "T" + taskTime + ":00";

    const { data, error: taskError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        task_date: taskDateTime,
      })
      .select("id, title, description, task_date, completed")
      .single();

    if (taskError) {
      setError(taskError.message);
      setSavingTask(false);
      return;
    }

    const newTask = data as Task;

    setTasks((current) => [...current, newTask]);

    await logActivity(
      "task_added",
      "Added task: " + newTask.title,
      "Added a personal task to the calendar."
    );

    setSelectedDate(taskDate);

    const createdDate = new Date(taskDate + "T12:00:00");

    setCurrentDate(
      new Date(
        createdDate.getFullYear(),
        createdDate.getMonth(),
        1
      )
    );

    setShowTaskModal(false);
    setSavingTask(false);
  }

  async function toggleAssignment(
    assignment: Assignment
  ) {
    const nextCompleted = !assignment.completed;

    const { error: updateError } = await supabase
      .from("assignments")
      .update({
        completed: nextCompleted,
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
              completed: nextCompleted,
            }
          : item
      )
    );

    await logActivity(
      nextCompleted
        ? "assignment_completed"
        : "assignment_uncompleted",
      nextCompleted
        ? "Completed assignment: " + assignment.title
        : "Uncompleted assignment: " + assignment.title,
      assignment.module
        ? assignment.module?.[0]?.name
        : null
    );
  }

  async function toggleTask(task: Task) {
    const nextCompleted = !task.completed;

    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        completed: nextCompleted,
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
              completed: nextCompleted,
            }
          : item
      )
    );

    await logActivity(
      nextCompleted
        ? "task_completed"
        : "task_uncompleted",
      nextCompleted
        ? "Completed task: " + task.title
        : "Uncompleted task: " + task.title,
      task.description
    );
  }

  async function deleteTask(task: Task) {
    const confirmed = window.confirm(
      "Delete this task?"
    );

    if (!confirmed) {
      return;
    }

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
      "Deleted task: " + task.title,
      task.description
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f7f7f5]">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 md:px-8 md:py-8">

          {/* HEADER */}
          <div className="mb-6 flex flex-col gap-5 sm:mb-8 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                  Planner
                </span>

                <span className="text-xs text-black/30">
                  Stay on track
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Calendar
              </h1>

              <p className="mt-2 max-w-xl text-sm text-black/50 sm:text-base">
                Keep track of your university deadlines and plans.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={goToToday}
                className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
              >
                Today
              </button>

              <button
                onClick={() => openTaskModal()}
                className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black/80"
              >
                + Add task
              </button>
            </div>
          </div>

          {/* MONTH STATS */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                Month
              </p>

              <p className="mt-1 text-lg font-bold text-blue-950">
                {monthName}
              </p>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                Assignments
              </p>

              <p className="mt-1 text-2xl font-bold text-orange-950">
                {monthAssignments.length}
              </p>
            </div>

            <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-500">
                Tasks
              </p>

              <p className="mt-1 text-2xl font-bold text-teal-950">
                {monthTasks.length}
              </p>
            </div>

            <div className="rounded-2xl border border-green-100 bg-green-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                Completed
              </p>

              <p className="mt-1 text-2xl font-bold text-green-950">
                {monthCompleted}
                <span className="ml-1 text-sm font-medium text-green-600">
                  / {monthTotal}
                </span>
              </p>
            </div>
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

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">

            {/* CALENDAR */}
            <section className="min-w-0 rounded-3xl border border-black/10 bg-white p-3 shadow-sm sm:p-5 md:p-6">

              <div className="mb-5 flex items-center justify-between gap-3">
                <button
                  onClick={previousMonth}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 text-lg transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                  aria-label="Previous month"
                >
                  ←
                </button>

                <div className="text-center">
                  <h2 className="text-base font-bold sm:text-lg">
                    {monthName}
                  </h2>

                  {year === new Date().getFullYear() &&
                    month === new Date().getMonth() && (
                      <p className="mt-0.5 text-[11px] font-medium text-blue-500">
                        Current month
                      </p>
                    )}
                </div>

                <button
                  onClick={nextMonth}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 text-lg transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                  aria-label="Next month"
                >
                  →
                </button>
              </div>

              <div className="grid grid-cols-7 border-b border-black/10 pb-3">
                {[
                  "Sun",
                  "Mon",
                  "Tue",
                  "Wed",
                  "Thu",
                  "Fri",
                  "Sat",
                ].map((day) => (
                  <div
                    key={day}
                    className="text-center text-[10px] font-semibold uppercase tracking-wide text-black/35 sm:text-xs"
                  >
                    <span className="sm:hidden">
                      {day.slice(0, 1)}
                    </span>

                    <span className="hidden sm:inline">
                      {day}
                    </span>
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map(
                    (_, index) => (
                      <div
                        key={index}
                        className="min-h-16 animate-pulse rounded-xl bg-black/[0.03] sm:min-h-24"
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    if (day === null) {
                      return (
                        <div
                          key={"empty-" + index}
                          className="min-h-16 rounded-xl sm:min-h-24"
                        />
                      );
                    }

                    const date = new Date(year, month, day);
                    const dateKey = formatDateKey(date);

                    const dayAssignments =
                      assignmentsByDate[dateKey] || [];

                    const dayTasks =
                      tasksByDate[dateKey] || [];

                    const totalItems =
                      dayAssignments.length +
                      dayTasks.length;

                    const completedItems =
                      dayAssignments.filter(
                        (assignment) =>
                          assignment.completed
                      ).length +
                      dayTasks.filter(
                        (task) => task.completed
                      ).length;

                    const isToday =
                      dateKey === todayKey;

                    const isSelected =
                      dateKey === selectedDate;

                    const allComplete =
                      totalItems > 0 &&
                      completedItems === totalItems;

                    return (
                      <button
                        key={dateKey}
                        onClick={() =>
                          setSelectedDate(dateKey)
                        }
                        className={
                          "min-h-16 overflow-hidden rounded-xl border p-1.5 text-left transition sm:min-h-24 sm:p-2 " +
                          (isSelected
                            ? "border-blue-300 bg-blue-50/50 shadow-sm"
                            : "border-transparent hover:border-blue-100 hover:bg-blue-50/30")
                        }
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={
                              "flex h-6 w-6 items-center justify-center rounded-full text-xs sm:h-7 sm:w-7 sm:text-sm " +
                              (isToday
                                ? "bg-blue-600 font-bold text-white shadow-sm"
                                : allComplete
                                ? "bg-green-100 font-semibold text-green-700"
                                : "text-black/70")
                            }
                          >
                            {day}
                          </span>

                          {totalItems > 0 && (
                            <span
                              className={
                                "text-[9px] font-semibold sm:text-[10px] " +
                                (allComplete
                                  ? "text-green-600"
                                  : "text-black/35")
                              }
                            >
                              {completedItems}/{totalItems}
                            </span>
                          )}
                        </div>

                        <div className="mt-1.5 space-y-1 sm:mt-2">
                          {dayAssignments
                            .slice(0, 1)
                            .map((assignment) => (
                              <div
                                key={assignment.id}
                                className={
                                  "truncate rounded-md px-1 py-1 text-[9px] font-medium sm:px-1.5 sm:text-[10px] " +
                                  (assignment.completed
                                    ? "bg-green-50 text-green-600 line-through"
                                    : "bg-orange-100 text-orange-700")
                                }
                              >
                                {assignment.title}
                              </div>
                            ))}

                          {dayTasks
                            .slice(0, 1)
                            .map((task) => (
                              <div
                                key={task.id}
                                className={
                                  "truncate rounded-md border px-1 py-1 text-[9px] font-medium sm:px-1.5 sm:text-[10px] " +
                                  (task.completed
                                    ? "border-teal-100 bg-teal-50 text-teal-500 line-through"
                                    : "border-teal-100 bg-teal-50/60 text-teal-700")
                                }
                              >
                                {task.title}
                              </div>
                            ))}

                          {totalItems > 2 && (
                            <div className="px-1 text-[9px] text-black/35 sm:text-[10px]">
                              +{totalItems - 2} more
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-black/10 pt-4 text-xs text-black/50">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
                  Assignment
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />
                  Personal task
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  Today
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  Complete
                </div>
              </div>
            </section>

            {/* SELECTED DAY */}
            <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">

              <div className="mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-blue-500">
                      Selected day
                    </p>

                    <h2 className="mt-1 text-xl font-bold">
                      {selectedDateLabel}
                    </h2>
                  </div>

                  {selectedTotal > 0 && (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-600">
                      {selectedProgress}%
                    </div>
                  )}
                </div>

                {selectedTotal > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-black/40">
                        Daily progress
                      </span>

                      <span className="font-semibold text-black/60">
                        {selectedCompleted} of {selectedTotal}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-black/5">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{
                          width: selectedProgress + "%",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="space-y-3">
                  <div className="h-20 animate-pulse rounded-2xl bg-black/[0.03]" />
                  <div className="h-20 animate-pulse rounded-2xl bg-black/[0.03]" />
                </div>
              ) : selectedTotal === 0 ? (
                <div className="rounded-2xl border border-dashed border-blue-100 bg-blue-50/40 p-6 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-600">
                    +
                  </div>

                  <p className="mt-3 font-medium">
                    Nothing planned
                  </p>

                  <p className="mt-1 text-sm leading-5 text-black/40">
                    Add a task to start planning this day.
                  </p>

                  <button
                    onClick={() =>
                      openTaskModal(selectedDate)
                    }
                    className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    + Add task
                  </button>
                </div>
              ) : (
                <div className="space-y-6">

                  {selectedAssignments.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-orange-400" />

                        <p className="text-xs font-semibold uppercase tracking-wider text-black/35">
                          Assignments
                        </p>
                      </div>

                      <div className="space-y-3">
                        {selectedAssignments.map(
                          (assignment) => (
                            <div
                              key={assignment.id}
                              className={
                                "rounded-2xl border p-4 transition " +
                                (assignment.completed
                                  ? "border-green-100 bg-green-50/40"
                                  : "border-orange-100 bg-orange-50/30 hover:border-orange-200")
                              }
                            >
                              <div className="flex items-start gap-3">

                                <button
                                  onClick={() =>
                                    toggleAssignment(
                                      assignment
                                    )
                                  }
                                  className={
                                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs transition " +
                                    (assignment.completed
                                      ? "border-green-500 bg-green-500 text-white"
                                      : "border-orange-300 bg-white text-orange-600 hover:border-orange-500")
                                  }
                                  aria-label={
                                    assignment.completed
                                      ? "Mark assignment incomplete"
                                      : "Mark assignment complete"
                                  }
                                >
                                  {assignment.completed
                                    ? "✓"
                                    : ""}
                                </button>

                                <button
                                  onClick={() =>
                                    router.push(
                                      "/modules/" +
                                        assignment.module_id
                                    )
                                  }
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <p
                                    className={
                                      "font-semibold " +
                                      (assignment.completed
                                        ? "text-black/35 line-through"
                                        : "")
                                    }
                                  >
                                    {assignment.title}
                                  </p>

                                  {assignment.module && (
                                    <p className="mt-1 text-xs text-black/40">
                                      {assignment.module?.[0]?.code
                                        ? assignment.module?.[0]?.code +
                                          " • "
                                        : ""}
                                      {assignment.module?.[0]?.name}
                                    </p>
                                  )}
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTasks.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-teal-400" />

                        <p className="text-xs font-semibold uppercase tracking-wider text-black/35">
                          Personal tasks
                        </p>
                      </div>

                      <div className="space-y-3">
                        {selectedTasks.map((task) => (
                          <div
                            key={task.id}
                            className={
                              "rounded-2xl border p-4 transition " +
                              (task.completed
                                ? "border-green-100 bg-green-50/40"
                                : "border-teal-100 bg-teal-50/30 hover:border-teal-200")
                            }
                          >
                            <div className="flex items-start gap-3">

                              <button
                                onClick={() =>
                                  toggleTask(task)
                                }
                                className={
                                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs transition " +
                                  (task.completed
                                    ? "border-green-500 bg-green-500 text-white"
                                    : "border-teal-300 bg-white text-teal-600 hover:border-teal-500")
                                }
                                aria-label={
                                  task.completed
                                    ? "Mark task incomplete"
                                    : "Mark task complete"
                                }
                              >
                                {task.completed
                                  ? "✓"
                                  : ""}
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <p
                                    className={
                                      "font-semibold " +
                                      (task.completed
                                        ? "text-black/35 line-through"
                                        : "")
                                    }
                                  >
                                    {task.title}
                                  </p>

                                  <button
                                    onClick={() =>
                                      deleteTask(task)
                                    }
                                    className="shrink-0 text-xs text-black/30 transition hover:text-red-500"
                                  >
                                    Delete
                                  </button>
                                </div>

                                <p className="mt-1 text-xs font-medium text-teal-600">
                                  {formatTime(
                                    task.task_date
                                  )}
                                </p>

                                {task.description && (
                                  <p className="mt-2 text-sm leading-5 text-black/50">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() =>
                      openTaskModal(selectedDate)
                    }
                    className="w-full rounded-xl border border-dashed border-blue-200 bg-blue-50/30 py-3 text-sm font-medium text-blue-600 transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    + Add task
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* ADD TASK MODAL */}
      {showTaskModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowTaskModal(false);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">

            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="mb-2 inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-600">
                  Personal task
                </div>

                <h2 className="text-xl font-bold">
                  Add task
                </h2>

                <p className="mt-1 text-sm text-black/40">
                  Add something to your university schedule.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowTaskModal(false)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-black/40 hover:bg-black/5 hover:text-black"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={createTask}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Task
                </label>

                <input
                  type="text"
                  required
                  maxLength={120}
                  value={taskTitle}
                  onChange={(e) =>
                    setTaskTitle(e.target.value)
                  }
                  placeholder="e.g. Study Thermodynamics"
                  className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  value={taskDescription}
                  maxLength={500}
                  onChange={(e) =>
                    setTaskDescription(e.target.value)
                  }
                  placeholder="Optional"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Date
                  </label>

                  <input
                    type="date"
                    required
                    value={taskDate}
                    onChange={(e) =>
                      setTaskDate(e.target.value)
                    }
                    className="w-full rounded-xl border border-black/10 px-3 py-3 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Time
                  </label>

                  <input
                    type="time"
                    required
                    value={taskTime}
                    onChange={(e) =>
                      setTaskTime(e.target.value)
                    }
                    className="w-full rounded-xl border border-black/10 px-3 py-3 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowTaskModal(false)
                  }
                  className="flex-1 rounded-xl border border-black/10 py-3 text-sm font-medium transition hover:bg-black/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingTask}
                  className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                  {savingTask
                    ? "Adding..."
                    : "Add task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}