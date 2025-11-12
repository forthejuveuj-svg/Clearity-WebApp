import { useEffect, useMemo, useState, ChangeEvent, FormEvent } from "react";
import { Plus, MessageCircle, Trash2, Save } from "lucide-react";

export interface TaskManagerTask {
  id: string;
  title: string;
  subtask: string;
  kpi: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskManagerProps {
  tasks: TaskManagerTask[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string | null) => void;
  onCreateTask: (task: { title: string; subtask: string; kpi: string }) => TaskManagerTask;
  onUpdateTask: (taskId: string, updates: { title: string; subtask: string; kpi: string }) => void;
  onDeleteTask: (taskId: string) => void;
  onNavigateToChat?: (task: TaskManagerTask) => void;
}

interface TaskDraft {
  title: string;
  subtask: string;
  kpi: string;
}

const emptyDraft: TaskDraft = {
  title: "",
  subtask: "",
  kpi: "",
};

export const TaskManager = ({
  tasks,
  selectedTaskId,
  onSelectTask,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onNavigateToChat,
}: TaskManagerProps) => {
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tasks]);

  const selectedTask = useMemo(
    () => sortedTasks.find((task) => task.id === selectedTaskId) ?? null,
    [sortedTasks, selectedTaskId],
  );

  useEffect(() => {
    if (selectedTask) {
      setDraft({
        title: selectedTask.title,
        subtask: selectedTask.subtask,
        kpi: selectedTask.kpi,
      });
      setIsCreatingNew(false);
    } else if (isCreatingNew) {
      setDraft(emptyDraft);
    } else if (tasks.length === 0) {
      setDraft(emptyDraft);
    }
  }, [selectedTask, isCreatingNew, tasks.length]);

  useEffect(() => {
    if (tasks.length === 0 && !isCreatingNew) {
      setIsCreatingNew(false);
    }
  }, [tasks.length, isCreatingNew]);

  const handleStartNewTask = () => {
    setIsCreatingNew(true);
    setDraft(emptyDraft);
    onSelectTask(null);
  };

  const handleSelectExistingTask = (taskId: string) => {
    setIsCreatingNew(false);
    onSelectTask(taskId);
  };

  const handleChange = (field: keyof TaskDraft) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.subtask.trim() || !draft.kpi.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const newTask = onCreateTask({
        title: draft.title.trim(),
        subtask: draft.subtask.trim(),
        kpi: draft.kpi.trim(),
      });
      onSelectTask(newTask.id);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTask) {
      return;
    }

    if (!draft.title.trim() || !draft.subtask.trim() || !draft.kpi.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      onUpdateTask(selectedTask.id, {
        title: draft.title.trim(),
        subtask: draft.subtask.trim(),
        kpi: draft.kpi.trim(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!selectedTask) {
      return;
    }
    onDeleteTask(selectedTask.id);
    setIsCreatingNew(false);
  };

  const handleOpenChat = () => {
    if (selectedTask && onNavigateToChat) {
      onNavigateToChat(selectedTask);
    }
  };

  const renderEmptyState = () => (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/70">
      <p className="text-lg font-medium text-white/80">No tasks yet</p>
      <p className="max-w-sm text-sm text-white/50">Create your first task to keep track of what matters. Tasks stay here across sessions.</p>
      <button
        onClick={handleStartNewTask}
        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-500/30"
      >
        <Plus className="h-4 w-4" />
        New Task
      </button>
    </div>
  );

  return (
    <div className="flex h-full w-full bg-gray-950/80 backdrop-blur-md">
      <aside className="flex w-80 shrink-0 flex-col border-r border-white/10 bg-gray-950/60 p-4 shadow-lg shadow-black/30">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Task Manager</h2>
          <button
            onClick={handleStartNewTask}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-200 transition hover:bg-blue-500/30"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto pr-2">
          {sortedTasks.map((task) => {
            const isActive = task.id === selectedTask?.id;
            return (
              <button
                key={task.id}
                onClick={() => handleSelectExistingTask(task.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                  isActive
                    ? "border-blue-500/60 bg-blue-500/10 text-white shadow-md shadow-blue-500/20"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <p className="text-sm font-semibold text-white">{task.title}</p>
                <p className="mt-1 text-xs text-white/50">Subtask: {task.subtask}</p>
                <p className="text-xs text-white/50">KPI: {task.kpi}</p>
              </button>
            );
          })}
          {sortedTasks.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-center text-sm text-white/50">
              Tasks you create during any session will appear here.
            </div>
          )}
        </div>
      </aside>

      <section className="flex flex-1 flex-col">
        <header className="border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {selectedTask ? selectedTask.title : "Create a new task"}
              </h3>
              <p className="text-xs text-white/40">
                Capture title, subtask, and KPI to keep your goals aligned.
              </p>
            </div>
            {selectedTask && onNavigateToChat && (
              <button
                onClick={handleOpenChat}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-500/20 px-3 py-2 text-xs font-semibold text-purple-200 transition hover:bg-purple-500/30"
              >
                <MessageCircle className="h-4 w-4" />
                Discuss in Chat
              </button>
            )}
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden">
          {sortedTasks.length === 0 && !selectedTask && !isCreatingNew ? (
            <div className="flex-1">{renderEmptyState()}</div>
          ) : (
            <form
              onSubmit={selectedTask ? handleUpdate : handleCreate}
              className="flex-1 space-y-6 overflow-y-auto px-6 py-6"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                  Task Name
                </label>
                <input
                  value={draft.title}
                  onChange={handleChange("title")}
                  placeholder="Example: Launch personal website"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                  Subtask
                </label>
                <textarea
                  value={draft.subtask}
                  onChange={handleChange("subtask")}
                  placeholder="Example: Draft hero section copy"
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                  KPI
                </label>
                <input
                  value={draft.kpi}
                  onChange={handleChange("kpi")}
                  placeholder="Example: Publish by next Friday"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSaving || !draft.title.trim() || !draft.subtask.trim() || !draft.kpi.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  {selectedTask ? "Save changes" : "Create task"}
                </button>

                <button
                  type="button"
                  onClick={handleStartNewTask}
                  className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10"
                >
                  Start new
                </button>

                {selectedTask && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/30"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete task
                  </button>
                )}
              </div>

              {selectedTask && (
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/40">
                  <p>Created: {new Date(selectedTask.createdAt).toLocaleString()}</p>
                  <p>Last updated: {new Date(selectedTask.updatedAt).toLocaleString()}</p>
                </div>
              )}
            </form>
          )}
        </div>
      </section>
    </div>
  );
};


