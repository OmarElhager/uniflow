"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabase";

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
  completed: boolean;
  created_at: string;
};

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  created_at: string;
};

export default function ModulePage() {
  const params = useParams();
  const router = useRouter();

  const moduleId = String(params.id);

  const [module, setModule] = useState<Module | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [showEditModuleModal, setShowEditModuleModal] =
    useState(false);
  const [showAddLectureModal, setShowAddLectureModal] =
    useState(false);
  const [showEditLectureModal, setShowEditLectureModal] =
    useState(false);
  const [showAddAssignmentModal, setShowAddAssignmentModal] =
    useState(false);
  const [showEditAssignmentModal, setShowEditAssignmentModal] =
    useState(false);

  const [editingLecture, setEditingLecture] =
    useState<Lecture | null>(null);
  const [editingAssignment, setEditingAssignment] =
    useState<Assignment | null>(null);

  const [editModuleName, setEditModuleName] = useState("");
  const [editModuleCode, setEditModuleCode] = useState("");
  const [editModuleDescription, setEditModuleDescription] =
    useState("");

  const [lectureTitle, setLectureTitle] = useState("");
  const [lectureWeek, setLectureWeek] = useState("");
  const [lectureDescription, setLectureDescription] =
    useState("");
  const [lectureFile, setLectureFile] =
    useState<File | null>(null);

  const [editLectureTitle, setEditLectureTitle] = useState("");
  const [editLectureWeek, setEditLectureWeek] = useState("");
  const [editLectureDescription, setEditLectureDescription] =
    useState("");
  const [editLectureFile, setEditLectureFile] =
    useState<File | null>(null);
  const [removeLectureFile, setRemoveLectureFile] =
    useState(false);

  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] =
    useState("");
  const [assignmentDueDate, setAssignmentDueDate] =
    useState("");

  const [editAssignmentTitle, setEditAssignmentTitle] =
    useState("");
  const [editAssignmentDescription, setEditAssignmentDescription] =
    useState("");
  const [editAssignmentDueDate, setEditAssignmentDueDate] =
    useState("");

  useEffect(() => {
    loadModule();
  }, [moduleId]);

  async function getCurrentUserId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return null;
    }

    return user.id;
  }

  async function loadModule() {
    setLoading(true);
    setError("");

    const userId = await getCurrentUserId();

    if (!userId) {
      return;
    }

    const { data: moduleData, error: moduleError } =
      await supabase
        .from("modules")
        .select("id, name, code, description")
        .eq("id", moduleId)
        .eq("user_id", userId)
        .single();

    if (moduleError) {
      setError(moduleError.message);
      setLoading(false);
      return;
    }

    const { data: lectureData, error: lectureError } =
      await supabase
        .from("lectures")
        .select(
          "id, module_id, title, week, description, file_url, completed, created_at"
        )
        .eq("module_id", moduleId)
        .order("week", { ascending: true })
        .order("created_at", { ascending: true });

    if (lectureError) {
      setError(lectureError.message);
      setLoading(false);
      return;
    }

    const {
      data: assignmentData,
      error: assignmentError,
    } = await supabase
      .from("assignments")
      .select(
        "id, title, description, due_date, completed, created_at"
      )
      .eq("module_id", moduleId)
      .order("due_date", { ascending: true });

    if (assignmentError) {
      setError(assignmentError.message);
      setLoading(false);
      return;
    }

    setModule(moduleData);
    setLectures(lectureData || []);
    setAssignments(assignmentData || []);
    setLoading(false);
  }

  async function logActivity(
    type: string,
    title: string,
    description: string | null,
    activityModuleId: string | null
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
      module_id: activityModuleId,
    });
  }

  function formatDueDate(date: string | null) {
    if (!date) {
      return "No deadline";
    }

    return new Date(date).toLocaleString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatDateOnly(date: string | null) {
    if (!date) {
      return "No deadline";
    }

    return new Date(date).toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function openEditModule() {
    if (!module) {
      return;
    }

    setEditModuleName(module.name);
    setEditModuleCode(module.code || "");
    setEditModuleDescription(module.description || "");
    setShowEditModuleModal(true);
  }

  async function updateModule(e: React.FormEvent) {
    e.preventDefault();

    if (!module) {
      return;
    }

    if (!editModuleName.trim()) {
      return;
    }

    setSaving(true);
    setError("");

    const newName = editModuleName.trim();
    const newCode = editModuleCode.trim() || null;
    const newDescription =
      editModuleDescription.trim() || null;

    const { error: updateError } = await supabase
      .from("modules")
      .update({
        name: newName,
        code: newCode,
        description: newDescription,
      })
      .eq("id", module.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    await logActivity(
      "module_updated",
      "Updated " + newName,
      newDescription,
      module.id
    );

    setShowEditModuleModal(false);

    await loadModule();

    setSaving(false);
  }

  async function deleteModule() {
    if (!module) {
      return;
    }

    const confirmed = window.confirm(
      "Delete " +
        module.name +
        "? This will also delete its lectures and assignments."
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("modules")
      .delete()
      .eq("id", module.id);

    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return;
    }

    router.push("/modules");
  }

  async function addLecture(e: React.FormEvent) {
    e.preventDefault();

    if (!lectureTitle.trim()) {
      return;
    }

    setSaving(true);
    setError("");

    let uploadedPath: string | null = null;

    if (lectureFile) {
      if (lectureFile.type !== "application/pdf") {
        setError("Only PDF files are allowed.");
        setSaving(false);
        return;
      }

      if (lectureFile.size > 20 * 1024 * 1024) {
        setError("PDF files must be smaller than 20 MB.");
        setSaving(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in.");
        setSaving(false);
        return;
      }

      const safeName = lectureFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      );

      uploadedPath =
        user.id +
        "/" +
        moduleId +
        "/" +
        Date.now() +
        "-" +
        safeName;

      const { error: uploadError } =
        await supabase.storage
          .from("lecture-files")
          .upload(uploadedPath, lectureFile, {
            contentType: "application/pdf",
            upsert: false,
          });

      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        return;
      }
    }

    const { error: insertError } =
      await supabase.from("lectures").insert({
        module_id: moduleId,
        title: lectureTitle.trim(),
        week: lectureWeek ? Number(lectureWeek) : null,
        description:
          lectureDescription.trim() || null,
        file_url: uploadedPath,
        completed: false,
      });

    if (insertError) {
      if (uploadedPath) {
        await supabase.storage
          .from("lecture-files")
          .remove([uploadedPath]);
      }

      setError(insertError.message);
      setSaving(false);
      return;
    }

    await logActivity(
      "lecture_added",
      "Added " + lectureTitle.trim(),
      lectureDescription.trim() || null,
      moduleId
    );

    setLectureTitle("");
    setLectureWeek("");
    setLectureDescription("");
    setLectureFile(null);
    setShowAddLectureModal(false);

    await loadModule();

    setSaving(false);
  }

  function openEditLecture(lecture: Lecture) {
    setEditingLecture(lecture);
    setEditLectureTitle(lecture.title);
    setEditLectureWeek(
      lecture.week !== null ? String(lecture.week) : ""
    );
    setEditLectureDescription(lecture.description || "");
    setEditLectureFile(null);
    setRemoveLectureFile(false);
    setShowEditLectureModal(true);
  }

  async function updateLecture(e: React.FormEvent) {
    e.preventDefault();

    if (!editingLecture) {
      return;
    }

    if (!editLectureTitle.trim()) {
      return;
    }

    setSaving(true);
    setError("");

    let newFilePath = editingLecture.file_url;
    let uploadedNewPath: string | null = null;

    const oldFilePath = editingLecture.file_url;

    if (editLectureFile) {
      if (editLectureFile.type !== "application/pdf") {
        setError("Only PDF files are allowed.");
        setSaving(false);
        return;
      }

      if (editLectureFile.size > 20 * 1024 * 1024) {
        setError("PDF files must be smaller than 20 MB.");
        setSaving(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in.");
        setSaving(false);
        return;
      }

      const safeName = editLectureFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "-"
      );

      uploadedNewPath =
        user.id +
        "/" +
        moduleId +
        "/" +
        Date.now() +
        "-" +
        safeName;

      const { error: uploadError } =
        await supabase.storage
          .from("lecture-files")
          .upload(
            uploadedNewPath,
            editLectureFile,
            {
              contentType: "application/pdf",
              upsert: false,
            }
          );

      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        return;
      }

      newFilePath = uploadedNewPath;
    } else if (removeLectureFile) {
      newFilePath = null;
    }

    const { error: updateError } =
      await supabase
        .from("lectures")
        .update({
          title: editLectureTitle.trim(),
          week: editLectureWeek
            ? Number(editLectureWeek)
            : null,
          description:
            editLectureDescription.trim() || null,
          file_url: newFilePath,
        })
        .eq("id", editingLecture.id);

    if (updateError) {
      if (uploadedNewPath) {
        await supabase.storage
          .from("lecture-files")
          .remove([uploadedNewPath]);
      }

      setError(updateError.message);
      setSaving(false);
      return;
    }

    if (
      oldFilePath &&
      newFilePath !== oldFilePath
    ) {
      await supabase.storage
        .from("lecture-files")
        .remove([oldFilePath]);
    }

    await logActivity(
      "lecture_updated",
      "Updated " + editLectureTitle.trim(),
      editLectureDescription.trim() || null,
      moduleId
    );

    setShowEditLectureModal(false);
    setEditingLecture(null);
    setEditLectureTitle("");
    setEditLectureWeek("");
    setEditLectureDescription("");
    setEditLectureFile(null);
    setRemoveLectureFile(false);

    await loadModule();

    setSaving(false);
  }

  async function deleteLecture(lecture: Lecture) {
    const confirmed = window.confirm(
      "Delete " + lecture.title + "?"
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");

    const { error: deleteError } =
      await supabase
        .from("lectures")
        .delete()
        .eq("id", lecture.id);

    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return;
    }

    if (lecture.file_url) {
      await supabase.storage
        .from("lecture-files")
        .remove([lecture.file_url]);
    }

    await logActivity(
      "lecture_deleted",
      "Deleted " + lecture.title,
      null,
      moduleId
    );

    await loadModule();

    setSaving(false);
  }

  async function toggleLecture(lecture: Lecture) {
    const newCompleted = !lecture.completed;

    const { error: updateError } =
      await supabase
        .from("lectures")
        .update({
          completed: newCompleted,
        })
        .eq("id", lecture.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await logActivity(
      newCompleted
        ? "lecture_completed"
        : "lecture_uncompleted",
      newCompleted
        ? "Completed " + lecture.title
        : "Marked " +
            lecture.title +
            " as incomplete",
      null,
      moduleId
    );

    await loadModule();
  }

  async function openLectureFile(lecture: Lecture) {
    if (!lecture.file_url) {
      return;
    }

    const {
      data,
      error: signedUrlError,
    } = await supabase.storage
      .from("lecture-files")
      .createSignedUrl(
        lecture.file_url,
        60 * 10
      );

    if (signedUrlError) {
      setError(signedUrlError.message);
      return;
    }

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  }

  async function addAssignment(e: React.FormEvent) {
    e.preventDefault();

    if (!assignmentTitle.trim()) {
      return;
    }

    setSaving(true);
    setError("");

    const dueDate = assignmentDueDate
      ? new Date(assignmentDueDate).toISOString()
      : null;

    const { error: insertError } =
      await supabase
        .from("assignments")
        .insert({
          module_id: moduleId,
          title: assignmentTitle.trim(),
          description:
            assignmentDescription.trim() || null,
          due_date: dueDate,
          completed: false,
        });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    await logActivity(
      "assignment_added",
      "Added " + assignmentTitle.trim(),
      assignmentDescription.trim() || null,
      moduleId
    );

    setAssignmentTitle("");
    setAssignmentDescription("");
    setAssignmentDueDate("");
    setShowAddAssignmentModal(false);

    await loadModule();

    setSaving(false);
  }

  function openEditAssignment(
    assignment: Assignment
  ) {
    setEditingAssignment(assignment);
    setEditAssignmentTitle(assignment.title);
    setEditAssignmentDescription(
      assignment.description || ""
    );

    if (assignment.due_date) {
      const date = new Date(
        assignment.due_date
      );

      const year = date.getFullYear();
      const month = String(
        date.getMonth() + 1
      ).padStart(2, "0");
      const day = String(
        date.getDate()
      ).padStart(2, "0");
      const hours = String(
        date.getHours()
      ).padStart(2, "0");
      const minutes = String(
        date.getMinutes()
      ).padStart(2, "0");

      setEditAssignmentDueDate(
        year +
          "-" +
          month +
          "-" +
          day +
          "T" +
          hours +
          ":" +
          minutes
      );
    } else {
      setEditAssignmentDueDate("");
    }

    setShowEditAssignmentModal(true);
  }

  async function updateAssignment(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!editingAssignment) {
      return;
    }

    if (!editAssignmentTitle.trim()) {
      return;
    }

    setSaving(true);
    setError("");

    const newTitle =
      editAssignmentTitle.trim();

    const newDescription =
      editAssignmentDescription.trim() ||
      null;

    const newDueDate =
      editAssignmentDueDate
        ? new Date(
            editAssignmentDueDate
          ).toISOString()
        : null;

    const { error: updateError } =
      await supabase
        .from("assignments")
        .update({
          title: newTitle,
          description: newDescription,
          due_date: newDueDate,
        })
        .eq(
          "id",
          editingAssignment.id
        );

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    await logActivity(
      "assignment_updated",
      "Updated " + newTitle,
      newDescription,
      moduleId
    );

    setShowEditAssignmentModal(false);
    setEditingAssignment(null);
    setEditAssignmentTitle("");
    setEditAssignmentDescription("");
    setEditAssignmentDueDate("");

    await loadModule();

    setSaving(false);
  }

  async function deleteAssignment(
    assignment: Assignment
  ) {
    const confirmed = window.confirm(
      "Delete " + assignment.title + "?"
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");

    const { error: deleteError } =
      await supabase
        .from("assignments")
        .delete()
        .eq("id", assignment.id);

    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return;
    }

    await logActivity(
      "assignment_deleted",
      "Deleted " + assignment.title,
      null,
      moduleId
    );

    await loadModule();

    setSaving(false);
  }

  async function toggleAssignment(
    assignment: Assignment
  ) {
    const newCompleted =
      !assignment.completed;

    const { error: updateError } =
      await supabase
        .from("assignments")
        .update({
          completed: newCompleted,
        })
        .eq("id", assignment.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await logActivity(
      newCompleted
        ? "assignment_completed"
        : "assignment_uncompleted",
      newCompleted
        ? "Completed " +
            assignment.title
        : "Marked " +
            assignment.title +
            " as incomplete",
      null,
      moduleId
    );

    await loadModule();
  }

  const completedLectures =
    lectures.filter(
      (lecture) => lecture.completed
    ).length;

  const completedAssignments =
    assignments.filter(
      (assignment) => assignment.completed
    ).length;

  const totalItems =
    lectures.length +
    assignments.length;

  const completedItems =
    completedLectures +
    completedAssignments;

  const progress =
    totalItems > 0
      ? Math.round(
          (completedItems / totalItems) *
            100
        )
      : 0;

  const lectureProgress =
    lectures.length > 0
      ? Math.round(
          (completedLectures /
            lectures.length) *
            100
        )
      : 0;

  const assignmentProgress =
    assignments.length > 0
      ? Math.round(
          (completedAssignments /
            assignments.length) *
            100
        )
      : 0;

  const groupedLectures =
    lectures.reduce(
      (
        groups: {
          [key: string]: Lecture[];
        },
        lecture
      ) => {
        const week = lecture.week
          ? "Week " + lecture.week
          : "Other";

        if (!groups[week]) {
          groups[week] = [];
        }

        groups[week].push(lecture);

        return groups;
      },
      {}
    );

  if (loading) {
    return (
      <main className="flex min-h-screen bg-[#f7f7f5]">
        <Sidebar />

        <div className="flex-1 p-6 md:p-10">
          <div className="mx-auto max-w-6xl">
            <div className="h-8 w-48 animate-pulse rounded-xl bg-black/5" />

            <div className="mt-6 h-64 animate-pulse rounded-3xl bg-white" />

            <div className="mt-8 h-40 animate-pulse rounded-3xl bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (!module) {
    return (
      <main className="flex min-h-screen bg-[#f7f7f5]">
        <Sidebar />

        <div className="flex-1 p-6 md:p-10">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-3xl border border-red-100 bg-red-50 p-6">
              <p className="font-semibold text-red-600">
                {error || "Module not found."}
              </p>

              <button
                onClick={() =>
                  router.push("/modules")
                }
                className="mt-4 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
              >
                Back to modules
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-[#f7f7f5]">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl p-5 md:p-8 lg:p-10">

          {/* Back */}
          <button
            onClick={() =>
              router.push("/modules")
            }
            className="mb-6 text-sm font-medium text-black/45 transition hover:text-blue-600"
          >
            ← Back to modules
          </button>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Module Hero */}
          <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-6 shadow-sm md:p-8">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-100/50 blur-3xl" />

            <div className="relative">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div className="min-w-0">
                  {module.code && (
                    <div className="mb-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                      {module.code}
                    </div>
                  )}

                  <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                    {module.name}
                  </h1>

                  {module.description && (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-black/50 md:text-base">
                      {module.description}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={openEditModule}
                    className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                  >
                    Edit module
                  </button>

                  <button
                    onClick={deleteModule}
                    disabled={saving}
                    className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Progress
                    </p>

                    <span className="text-lg">◔</span>
                  </div>

                  <p className="mt-2 text-4xl font-bold tracking-tight text-blue-600">
                    {progress}%
                  </p>

                  <p className="mt-1 text-xs text-black/40">
                    {completedItems} of {totalItems} completed
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                      Lectures
                    </p>

                    <span className="text-lg">▤</span>
                  </div>

                  <p className="mt-2 text-4xl font-bold tracking-tight text-violet-600">
                    {completedLectures}
                    <span className="text-xl text-black/20">
                      /{lectures.length}
                    </span>
                  </p>

                  <p className="mt-1 text-xs text-black/40">
                    {lectureProgress}% completed
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                      Assignments
                    </p>

                    <span className="text-lg">◫</span>
                  </div>

                  <p className="mt-2 text-4xl font-bold tracking-tight text-amber-600">
                    {completedAssignments}
                    <span className="text-xl text-black/20">
                      /{assignments.length}
                    </span>
                  </p>

                  <p className="mt-1 text-xs text-black/40">
                    {assignmentProgress}% completed
                  </p>
                </div>
              </div>

              {/* Overall progress */}
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-black/40">
                    Overall module progress
                  </span>

                  <span
                    className={
                      "text-xs font-bold " +
                      (progress === 100
                        ? "text-emerald-600"
                        : "text-blue-600")
                    }
                  >
                    {progress}%
                  </span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-blue-50">
                  <div
                    className={
                      "h-full rounded-full transition-all " +
                      (progress === 100
                        ? "bg-emerald-500"
                        : "bg-blue-500")
                    }
                    style={{
                      width: progress + "%",
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Lectures */}
          <section className="mt-10">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    ▤
                  </div>

                  <h2 className="text-2xl font-bold">
                    Lectures
                  </h2>
                </div>

                <p className="mt-2 text-sm text-black/45">
                  Manage your lecture content and PDFs.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowAddLectureModal(true)
                }
                className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-700"
              >
                + Add lecture
              </button>
            </div>

            {lectures.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  ▤
                </div>

                <p className="mt-4 font-semibold">
                  No lectures yet
                </p>

                <p className="mt-1 text-sm text-black/45">
                  Add your first lecture to this module.
                </p>
              </div>
            ) : (
              <div className="space-y-7">
                {Object.entries(groupedLectures).map(
                  ([week, weekLectures]) => (
                    <div key={week}>
                      <div className="mb-3 flex items-center gap-3">
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600">
                          {week}
                        </span>

                        <div className="h-px flex-1 bg-black/5" />
                      </div>

                      <div className="space-y-3">
                        {weekLectures.map(
                          (lecture) => (
                            <div
                              key={lecture.id}
                              className={
                                "group rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md " +
                                (lecture.completed
                                  ? "border-emerald-100"
                                  : "border-black/10")
                              }
                            >
                              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start gap-3">
                                    <button
                                      onClick={() =>
                                        toggleLecture(
                                          lecture
                                        )
                                      }
                                      className={
                                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition " +
                                        (lecture.completed
                                          ? "border-emerald-500 bg-emerald-500 text-white"
                                          : "border-black/20 text-transparent hover:border-violet-400 hover:bg-violet-50")
                                      }
                                    >
                                      ✓
                                    </button>

                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4
                                          className={
                                            "font-semibold " +
                                            (lecture.completed
                                              ? "text-black/40 line-through"
                                              : "")
                                          }
                                        >
                                          {lecture.title}
                                        </h4>

                                        {lecture.completed && (
                                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                            Completed
                                          </span>
                                        )}
                                      </div>

                                      {lecture.description && (
                                        <p className="mt-1 text-sm leading-6 text-black/50">
                                          {lecture.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2 md:justify-end">
                                  {lecture.file_url && (
                                    <button
                                      onClick={() =>
                                        openLectureFile(
                                          lecture
                                        )
                                      }
                                      className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                                    >
                                      PDF
                                    </button>
                                  )}

                                  <button
                                    onClick={() =>
                                      openEditLecture(
                                        lecture
                                      )
                                    }
                                    className="rounded-lg border border-black/10 px-3 py-2 text-sm transition hover:bg-black/5"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    onClick={() =>
                                      deleteLecture(
                                        lecture
                                      )
                                    }
                                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* Assignments */}
          <section className="mt-12">
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    ◫
                  </div>

                  <h2 className="text-2xl font-bold">
                    Assignments
                  </h2>
                </div>

                <p className="mt-2 text-sm text-black/45">
                  Track deadlines and completion.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowAddAssignmentModal(
                    true
                  )
                }
                className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-600"
              >
                + Add assignment
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-white p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  ◫
                </div>

                <p className="mt-4 font-semibold">
                  No assignments yet
                </p>

                <p className="mt-1 text-sm text-black/45">
                  Add an assignment to start tracking
                  your deadlines.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map(
                  (assignment) => (
                    <div
                      key={assignment.id}
                      className={
                        "rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md " +
                        (assignment.completed
                          ? "border-emerald-100"
                          : "border-black/10")
                      }
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <button
                            onClick={() =>
                              toggleAssignment(
                                assignment
                              )
                            }
                            className={
                              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition " +
                              (assignment.completed
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-black/20 text-transparent hover:border-amber-400 hover:bg-amber-50")
                            }
                          >
                            ✓
                          </button>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4
                                className={
                                  "font-semibold " +
                                  (assignment.completed
                                    ? "text-black/40 line-through"
                                    : "")
                                }
                              >
                                {assignment.title}
                              </h4>

                              {assignment.completed && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                  Completed
                                </span>
                              )}
                            </div>

                            {assignment.description && (
                              <p className="mt-1 text-sm leading-6 text-black/50">
                                {assignment.description}
                              </p>
                            )}

                            <p className="mt-2 text-xs text-black/40">
                              Due:{" "}
                              <span className="font-medium text-black/55">
                                {formatDueDate(
                                  assignment.due_date
                                )}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 md:shrink-0">
                          <button
                            onClick={() =>
                              openEditAssignment(
                                assignment
                              )
                            }
                            className="rounded-lg border border-black/10 px-3 py-2 text-sm transition hover:bg-black/5"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              deleteAssignment(
                                assignment
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Edit Module Modal */}
      {showEditModuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-600">
                M
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  Edit module
                </h2>

                <p className="text-xs text-black/40">
                  Update your module information.
                </p>
              </div>
            </div>

            <form
              onSubmit={updateModule}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Module name
                </label>

                <input
                  value={editModuleName}
                  onChange={(e) =>
                    setEditModuleName(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/5"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Module code
                </label>

                <input
                  value={editModuleCode}
                  onChange={(e) =>
                    setEditModuleCode(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/5"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  value={editModuleDescription}
                  onChange={(e) =>
                    setEditModuleDescription(
                      e.target.value
                    )
                  }
                  rows={4}
                  className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowEditModuleModal(
                      false
                    )
                  }
                  className="rounded-xl border border-black/10 px-4 py-2.5 text-sm transition hover:bg-black/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lecture Modal */}
      {showAddLectureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 font-bold text-violet-600">
                ▤
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  Add lecture
                </h2>

                <p className="text-xs text-black/40">
                  Add lecture details and optional PDF.
                </p>
              </div>
            </div>

            <form
              onSubmit={addLecture}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Lecture title
                </label>

                <input
                  value={lectureTitle}
                  onChange={(e) =>
                    setLectureTitle(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Introduction to Thermodynamics"
                  className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-500/5"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Week
                </label>

                <input
                  type="number"
                  min="1"
                  value={lectureWeek}
                  onChange={(e) =>
                    setLectureWeek(
                      e.target.value
                    )
                  }
                  placeholder="e.g. 3"
                  className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-500/5"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  value={lectureDescription}
                  onChange={(e) =>
                    setLectureDescription(
                      e.target.value
                    )
                  }
                  rows={4}
                  placeholder="What does this lecture cover?"
                  className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-500/5"
                />
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                <label className="mb-2 block text-sm font-semibold text-violet-700">
                  Lecture PDF
                </label>

                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) =>
                    setLectureFile(
                      e.target.files?.[0] ||
                        null
                    )
                  }
                  className="block w-full text-sm"
                />

                <p className="mt-2 text-xs text-black/40">
                  PDF only, maximum 20 MB.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowAddLectureModal(
                      false
                    )
                  }
                  className="rounded-xl border border-black/10 px-4 py-2.5 text-sm transition hover:bg-black/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  {saving
                    ? "Adding..."
                    : "Add lecture"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lecture Modal */}
      {showEditLectureModal &&
        editingLecture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 font-bold text-violet-600">
                  ▤
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    Edit lecture
                  </h2>

                  <p className="text-xs text-black/40">
                    Update lecture details or PDF.
                  </p>
                </div>
              </div>

              <form
                onSubmit={updateLecture}
                className="space-y-4"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Lecture title
                  </label>

                  <input
                    value={editLectureTitle}
                    onChange={(e) =>
                      setEditLectureTitle(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-500/5"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Week
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={editLectureWeek}
                    onChange={(e) =>
                      setEditLectureWeek(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-500/5"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Description
                  </label>

                  <textarea
                    value={
                      editLectureDescription
                    }
                    onChange={(e) =>
                      setEditLectureDescription(
                        e.target.value
                      )
                    }
                    rows={4}
                    className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-500/5"
                  />
                </div>

                <div className="rounded-2xl bg-[#f7f7f5] p-4">
                  <p className="text-sm font-semibold">
                    Current PDF
                  </p>

                  {editingLecture.file_url ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openLectureFile(
                            editingLecture
                          )
                        }
                        className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                      >
                        Open current PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRemoveLectureFile(
                            !removeLectureFile
                          );
                          setEditLectureFile(
                            null
                          );
                        }}
                        className={
                          "rounded-lg px-3 py-2 text-sm " +
                          (removeLectureFile
                            ? "bg-red-100 font-medium text-red-600"
                            : "border border-red-200 text-red-600 hover:bg-red-50")
                        }
                      >
                        {removeLectureFile
                          ? "PDF will be removed"
                          : "Remove PDF"}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-black/45">
                      No PDF attached.
                    </p>
                  )}
                </div>

                {!removeLectureFile && (
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                    <label className="mb-2 block text-sm font-semibold text-violet-700">
                      Replace PDF
                    </label>

                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(e) => {
                        setEditLectureFile(
                          e.target.files?.[0] ||
                            null
                        );
                        setRemoveLectureFile(
                          false
                        );
                      }}
                      className="block w-full text-sm"
                    />

                    <p className="mt-2 text-xs text-black/40">
                      PDF only, maximum 20 MB.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditLectureModal(
                        false
                      );
                      setEditingLecture(null);
                      setEditLectureFile(null);
                      setRemoveLectureFile(
                        false
                      );
                    }}
                    className="rounded-xl border border-black/10 px-4 py-2.5 text-sm transition hover:bg-black/5"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving || uploading
                    }
                    className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Add Assignment Modal */}
      {showAddAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 font-bold text-amber-600">
                ◫
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  Add assignment
                </h2>

                <p className="text-xs text-black/40">
                  Add a deadline and keep it on track.
                </p>
              </div>
            </div>

            <form
              onSubmit={addAssignment}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Assignment title
                </label>

                <input
                  value={assignmentTitle}
                  onChange={(e) =>
                    setAssignmentTitle(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Coursework 1"
                  className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-500/5"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  value={
                    assignmentDescription
                  }
                  onChange={(e) =>
                    setAssignmentDescription(
                      e.target.value
                    )
                  }
                  rows={4}
                  placeholder="What needs to be completed?"
                  className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-500/5"
                />
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                <label className="mb-2 block text-sm font-semibold text-amber-700">
                  Due date
                </label>

                <input
                  type="datetime-local"
                  value={
                    assignmentDueDate
                  }
                  onChange={(e) =>
                    setAssignmentDueDate(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-500/5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowAddAssignmentModal(
                      false
                    )
                  }
                  className="rounded-xl border border-black/10 px-4 py-2.5 text-sm transition hover:bg-black/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  {saving
                    ? "Adding..."
                    : "Add assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {showEditAssignmentModal &&
        editingAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 font-bold text-amber-600">
                  ◫
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    Edit assignment
                  </h2>

                  <p className="text-xs text-black/40">
                    Update the assignment and deadline.
                  </p>
                </div>
              </div>

              <form
                onSubmit={updateAssignment}
                className="space-y-4"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Assignment title
                  </label>

                  <input
                    value={
                      editAssignmentTitle
                    }
                    onChange={(e) =>
                      setEditAssignmentTitle(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-500/5"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Description
                  </label>

                  <textarea
                    value={
                      editAssignmentDescription
                    }
                    onChange={(e) =>
                      setEditAssignmentDescription(
                        e.target.value
                      )
                    }
                    rows={4}
                    className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-500/5"
                  />
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                  <label className="mb-2 block text-sm font-semibold text-amber-700">
                    Due date
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      editAssignmentDueDate
                    }
                    onChange={(e) =>
                      setEditAssignmentDueDate(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-500/5"
                  />

                  <p className="mt-2 text-xs text-black/40">
                    Leave empty if there is no deadline.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditAssignmentModal(
                        false
                      );
                      setEditingAssignment(null);
                    }}
                    className="rounded-xl border border-black/10 px-4 py-2.5 text-sm transition hover:bg-black/5"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : "Save changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </main>
  );
}