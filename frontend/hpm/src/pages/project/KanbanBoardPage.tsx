import { useEffect, useMemo, useState } from "react";
import projectIcon from "../../assets/kanban/icon-project.svg";
import KanbanColumn from "../../components/project/KanbanColumn";
import KanbanTaskModal from "../../components/project/KanbanTaskModal";
import {
  emptyKanbanForm,
  getKanbanBoardHeight,
  KANBAN_CATEGORIES,
  KANBAN_COLUMNS,
  KANBAN_PRIORITIES,
  toKanbanFormValues,
} from "../../constants/kanban";
import { useAuth } from "../../context/AuthContext";
import { getProjectJiraBoard, type ProjectJiraBoard } from "../../services/meeting";
import type {
  KanbanColumnId,
  KanbanModalState,
  KanbanPriority,
  KanbanTask,
} from "../../types/kanban";

const mapJiraPriority = (priority: string): KanbanPriority => {
  const normalized = priority.toLowerCase();
  if (normalized.includes("highest")) return KANBAN_PRIORITIES[4];
  if (normalized.includes("high")) return KANBAN_PRIORITIES[3];
  if (normalized.includes("lowest")) return KANBAN_PRIORITIES[0];
  if (normalized.includes("low")) return KANBAN_PRIORITIES[1];
  return KANBAN_PRIORITIES[2];
};

const jiraBoardToTasks = (board: ProjectJiraBoard): KanbanTask[] => {
  let nextId = 1;

  return KANBAN_COLUMNS.flatMap((column) =>
    (board[column.id] ?? []).map((issue) => ({
      id: nextId++,
      columnId: column.id,
      title: issue.title,
      description: issue.description,
      category: KANBAN_CATEGORIES[2],
      dueDate: issue.due_date || "",
      startDate: issue.created ? issue.created.slice(0, 10) : "",
      assignee: issue.assignee,
      priority: mapJiraPriority(issue.priority),
      code: issue.issue_key,
      owner: issue.assignee || "-",
    })),
  );
};

export default function KanbanBoardPage() {
  const { projectId, projectName } = useAuth();
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [modal, setModal] = useState<KanbanModalState | null>(null);

  useEffect(() => {
    if (!projectId) {
      setTasks([]);
      return;
    }

    getProjectJiraBoard(projectId)
      .then((board) => setTasks(jiraBoardToTasks(board)))
      .catch((error) => {
        console.error("Jira 칸반 조회 실패:", error);
        setTasks([]);
      });
  }, [projectId]);

  const tasksByColumn = useMemo(() => {
    return KANBAN_COLUMNS.reduce<Record<KanbanColumnId, KanbanTask[]>>(
      (acc, column) => {
        acc[column.id] = tasks.filter((task) => task.columnId === column.id);
        return acc;
      },
      { todo: [], progress: [], review: [], done: [] },
    );
  }, [tasks]);

  const boardHeight = useMemo(() => getKanbanBoardHeight(tasksByColumn), [tasksByColumn]);

  const openAddModal = (columnId: KanbanColumnId) => {
    setModal({ mode: "add", columnId, values: emptyKanbanForm() });
  };

  const openEditModal = (task: KanbanTask) => {
    setModal({
      mode: "edit",
      columnId: task.columnId,
      taskId: task.id,
      values: toKanbanFormValues(task),
    });
  };

  const closeModal = () => setModal(null);

  const submitTask = () => {
    if (!modal || !modal.values.title.trim() || !modal.values.priority) return;

    if (modal.mode === "edit" && modal.taskId) {
      setTasks((current) =>
        current.map((task) =>
          task.id === modal.taskId
            ? {
                ...task,
                ...modal.values,
                title: modal.values.title.trim(),
                priority: modal.values.priority as KanbanPriority,
              }
            : task,
        ),
      );
      closeModal();
      return;
    }

    setTasks((current) => {
      const nextId = Math.max(0, ...current.map((task) => task.id)) + 1;
      return [
        ...current,
        {
          id: nextId,
          columnId: modal.columnId,
          title: modal.values.title.trim(),
          description: modal.values.description,
          category: modal.values.category,
          dueDate: modal.values.dueDate,
          startDate: modal.values.startDate,
          assignee: modal.values.assignee,
          priority: modal.values.priority as KanbanPriority,
          code: "KAN-NEW",
          owner: modal.values.assignee,
        },
      ];
    });
    closeModal();
  };

  return (
    <div className="-m-6 min-h-screen overflow-auto bg-[#FFFDFD] pb-[80px] pt-[64px] font-pretendard">
      <section
        className="relative w-[1636px] transition-all duration-200 ease-out"
        style={{ height: boardHeight }}
        data-node-id={modal ? "43:4229" : "1:7286"}
        data-name="dashboard"
      >
        <section className="absolute left-[68px] top-[32px] flex items-center gap-[10px]">
          <img alt="" aria-hidden="true" className="size-[29px] object-contain" src={projectIcon} />
          <h1 className="m-0 whitespace-nowrap text-[24px] font-medium leading-[1.2] text-[#141414]">
            {projectName || "Jira 칸반"}
          </h1>
        </section>
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByColumn[column.id]}
            onAddTask={openAddModal}
            onEditTask={openEditModal}
          />
        ))}
      </section>

      {modal ? (
        <KanbanTaskModal
          modal={modal}
          onCancel={closeModal}
          onChange={(values) => setModal({ ...modal, values })}
          onSubmit={submitTask}
        />
      ) : null}
    </div>
  );
}
