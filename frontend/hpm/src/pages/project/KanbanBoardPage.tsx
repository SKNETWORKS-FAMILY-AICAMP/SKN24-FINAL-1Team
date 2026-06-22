import { useEffect, useMemo, useState } from "react";
import projectIcon from "../../assets/kanban/icon-project.svg";
import KanbanColumn from "../../components/project/KanbanColumn";
import KanbanTaskModal from "../../components/project/KanbanTaskModal";
import {
  emptyKanbanForm,
  getKanbanBoardHeight,
  KANBAN_COLUMNS,
  KANBAN_PRIORITIES,
  toKanbanFormValues,
} from "../../constants/kanban";
import { useAuth } from "../../context/AuthContext";
import {
  createProjectJiraIssue,
  getProjectDetail,
  getProjectJiraBoard,
  type ProjectMember,
  type ProjectJiraBoard,
  type JiraBoardColumn,
} from "../../services/meeting";
import type {
  KanbanColumnId,
  KanbanColumnConfig,
  KanbanModalState,
  KanbanPriority,
  KanbanTask,
} from "../../types/kanban";

const COLUMN_LEFT_START = 68;
const COLUMN_STEP = 384;
const BOARD_MIN_WIDTH = 1252;

const mapJiraPriority = (priority: string): KanbanPriority => {
  const normalized = priority.toLowerCase();
  if (normalized.includes("highest")) return KANBAN_PRIORITIES[4];
  if (normalized.includes("high")) return KANBAN_PRIORITIES[3];
  if (normalized.includes("lowest")) return KANBAN_PRIORITIES[0];
  if (normalized.includes("low")) return KANBAN_PRIORITIES[1];
  return KANBAN_PRIORITIES[2];
};

const mapKanbanPriorityToJira = (priority: KanbanPriority | "") => {
  const index = KANBAN_PRIORITIES.indexOf(priority as KanbanPriority);
  return ["Lowest", "Low", "Medium", "High", "Highest"][index] || "Medium";
};

const isEpicTask = (task: KanbanTask) => {
  const issueType = (task.issueType || "").toLowerCase();
  return (
    issueType === "epic" ||
    issueType.includes("에픽") ||
    task.issueTypeHierarchyLevel === 1
  );
};

const toKanbanColumns = (columns: JiraBoardColumn[]): KanbanColumnConfig[] => {
  if (columns.length === 0) return KANBAN_COLUMNS;

  return columns.map((column, index) => ({
    id: column.id,
    label: column.label,
    left: COLUMN_LEFT_START + index * COLUMN_STEP,
    height: 742,
    statusNames: column.status_names,
  }));
};

const jiraBoardToTasks = (board: ProjectJiraBoard, columns: KanbanColumnConfig[]): KanbanTask[] => {
  let nextId = 1;

  return columns.flatMap((column) =>
    (board.issues[column.id] ?? []).map((issue) => ({
      id: nextId++,
      columnId: column.id,
      title: issue.title,
      description: issue.description,
      category: issue.parent_title || "Epic 없음",
      dueDate: issue.due_date || "",
      startDate: issue.created ? issue.created.slice(0, 10) : "",
      assignee: issue.assignee,
      priority: mapJiraPriority(issue.priority),
      code: issue.issue_key,
      owner: issue.assignee || "-",
      parentKey: issue.parent_key || "",
      issueType: issue.issue_type || "",
      issueTypeIconUrl: issue.issue_type_icon_url || "",
      issueTypeHierarchyLevel: issue.issue_type_hierarchy_level ?? null,
    })),
  );
};

export default function KanbanBoardPage() {
  const { projectId, projectName } = useAuth();
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [boardColumns, setBoardColumns] = useState<KanbanColumnConfig[]>(KANBAN_COLUMNS);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [modal, setModal] = useState<KanbanModalState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setTasks([]);
      setBoardColumns(KANBAN_COLUMNS);
      return;
    }

    getProjectJiraBoard(projectId)
      .then((board) => {
        const nextColumns = toKanbanColumns(board.columns || []);
        setBoardColumns(nextColumns);
        setTasks(jiraBoardToTasks(board, nextColumns));
      })
      .catch((error) => {
        console.error("Jira 칸반 조회 실패:", error);
        setBoardColumns(KANBAN_COLUMNS);
        setTasks([]);
      });
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setMembers([]);
      return;
    }

    getProjectDetail(projectId)
      .then((project) => setMembers(project.members || []))
      .catch((error) => {
        console.error("프로젝트 구성원 조회 실패:", error);
        setMembers([]);
      });
  }, [projectId]);

  const tasksByColumn = useMemo(() => {
    return boardColumns.reduce<Record<KanbanColumnId, KanbanTask[]>>(
      (acc, column) => {
        acc[column.id] = tasks.filter((task) => task.columnId === column.id);
        return acc;
      },
      {},
    );
  }, [boardColumns, tasks]);

  const boardHeight = useMemo(
    () => getKanbanBoardHeight(tasksByColumn, boardColumns),
    [boardColumns, tasksByColumn],
  );
  const boardWidth = useMemo(
    () => Math.max(BOARD_MIN_WIDTH, COLUMN_LEFT_START * 2 + boardColumns.length * COLUMN_STEP),
    [boardColumns.length],
  );

  const assigneeOptions = useMemo(
    () =>
      members.map((member) => ({
        value: String(member.user_id),
        label: member.name,
      })),
    [members],
  );

  const parentOptions = useMemo(
    () =>
      tasks
        .filter(isEpicTask)
        .map((task) => ({
          value: task.code,
          label: task.title,
        })),
    [tasks],
  );

  const openAddModal = (columnId: KanbanColumnId) => {
    const defaultAssignee = assigneeOptions[0];
    setModal({
      mode: "add",
      columnId,
      values: {
        ...emptyKanbanForm(),
        assigneeId: defaultAssignee?.value || "",
        assignee: defaultAssignee?.label || "",
      },
    });
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

  const submitTask = async () => {
    if (!modal || !modal.values.title.trim() || !modal.values.priority || saving) return;

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

    if (!projectId) {
      alert("프로젝트를 먼저 선택해 주세요.");
      return;
    }

    setSaving(true);
    try {
      const result = await createProjectJiraIssue(projectId, {
        title: modal.values.title.trim(),
        description: modal.values.description,
        due_date: modal.values.dueDate || undefined,
        priority: mapKanbanPriorityToJira(modal.values.priority),
        column_id: modal.columnId,
        assignee_user_id: modal.values.assigneeId ? Number(modal.values.assigneeId) : undefined,
        parent_key: modal.values.parentKey || undefined,
        target_status_names: boardColumns.find((column) => column.id === modal.columnId)?.statusNames || [],
      });
      const optimisticTask: KanbanTask = {
        id: Math.max(0, ...tasks.map((task) => task.id)) + 1,
        columnId: modal.columnId,
        title: modal.values.title.trim(),
        description: modal.values.description,
        category: modal.values.category || "상위 업무 없음",
        dueDate: modal.values.dueDate,
        startDate: modal.values.startDate,
        assignee: modal.values.assignee,
        priority: modal.values.priority as KanbanPriority,
        code: result.issue_key,
        owner: modal.values.assignee || "-",
        parentKey: modal.values.parentKey,
        issueType: "",
        issueTypeIconUrl: "",
        issueTypeHierarchyLevel: null,
      };
      const board = await getProjectJiraBoard(projectId);
      const nextColumns = toKanbanColumns(board.columns || []);
      const nextTasks = jiraBoardToTasks(board, nextColumns);
      if (!nextTasks.some((task) => task.code === result.issue_key)) {
        nextTasks.unshift(optimisticTask);
      }
      setBoardColumns(nextColumns);
      setTasks(nextTasks);
      closeModal();
    } catch (error) {
      console.error("Jira 업무 생성 실패:", error);
      alert("Jira 업무 생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="-m-6 min-h-screen overflow-auto bg-[#FFFDFD] pb-[80px] pt-[64px] font-pretendard">
      <section
        className="relative transition-all duration-200 ease-out"
        style={{ height: boardHeight, width: boardWidth }}
        data-node-id={modal ? "43:4229" : "1:7286"}
        data-name="dashboard"
      >
        <section className="absolute left-[68px] top-[32px] flex items-center gap-[10px]">
          <img alt="" aria-hidden="true" className="size-[29px] object-contain" src={projectIcon} />
          <h1 className="m-0 whitespace-nowrap text-[24px] font-medium leading-[1.2] text-[#141414]">
            {projectName || "Jira 칸반"}
          </h1>
        </section>
        {boardColumns.map((column) => (
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
          assigneeOptions={assigneeOptions}
          parentOptions={parentOptions}
        />
      ) : null}
    </div>
  );
}
