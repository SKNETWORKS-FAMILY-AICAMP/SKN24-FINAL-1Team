import { useEffect, useMemo, useState } from "react";
import projectIcon from "../../assets/kanban/icon-project.svg";
import KanbanColumn from "../../components/project/KanbanColumn";
import KanbanTaskModal from "../../components/project/KanbanTaskModal";
import {
  emptyKanbanForm,
  getKanbanBoardHeight,
  getKanbanColumnHeight,
  KANBAN_COLUMNS,
  KANBAN_PRIORITIES,
  toKanbanFormValues,
} from "../../constants/kanban";
import { useAuth } from "../../context/AuthContext";
import {
  createProjectJiraIssue,
  getJiraStatus,
  getProjectDetail,
  getProjectJiraBoard,
  updateProjectJiraIssueStatus,
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
      assignee: issue.assignee || "-",
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

const getApiErrorMessage = (error: unknown) => {
  const data = (error as { response?: { data?: { error?: string; detail?: string } } }).response?.data;
  return data?.error || data?.detail || "Failed to load Jira board.";
};


export default function KanbanBoardPage() {
  const { projectId, projectName, user } = useAuth();
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [boardColumns, setBoardColumns] = useState<KanbanColumnConfig[]>(KANBAN_COLUMNS);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [modal, setModal] = useState<KanbanModalState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggingTask, setDraggingTask] = useState<KanbanTask | null>(null);
  const [canManageJira, setCanManageJira] = useState(false);

  useEffect(() => {
    if (!user) {
      setCanManageJira(false);
      return;
    }

    let active = true;
    getJiraStatus()
      .then((status) => {
        if (active) setCanManageJira(status.connected);
      })
      .catch(() => {
        if (active) setCanManageJira(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!projectId) {
      setTasks([]);
      setBoardColumns(KANBAN_COLUMNS);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    getProjectJiraBoard(projectId)
      .then((board) => {
        console.log("[KANBAN] board.columns:", board.columns);
        console.log("[KANBAN] board.issues keys:", Object.keys(board.issues || {}));
        const nextColumns = toKanbanColumns(board.columns || []);
        console.log("[KANBAN] nextColumns:", nextColumns.map(c => c.id));
        const nextTasks = jiraBoardToTasks(board, nextColumns);
        console.log("[KANBAN] tasks 수:", nextTasks.length);
        setBoardColumns(nextColumns);
        setTasks(nextTasks);
      })
      .catch((error) => {
        console.error("Jira 칸반 조회 실패:", error);
        setBoardColumns(KANBAN_COLUMNS);
        setTasks([]);
        setError(getApiErrorMessage(error));
      })
      .finally(() => {
        setLoading(false);
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
    const result = boardColumns.reduce<Record<KanbanColumnId, KanbanTask[]>>(
      (acc, column) => {
        acc[column.id] = tasks.filter((task) => task.columnId === column.id);
        return acc;
      },
      {},
    );
    console.log("[KANBAN] tasksByColumn:", Object.entries(result).map(([k,v]) => `${k}:${v.length}개`));
    return result;
  }, [boardColumns, tasks]);

  const boardHeight = useMemo(
    () => getKanbanBoardHeight(tasksByColumn, boardColumns),
    [boardColumns, tasksByColumn],
  );
  const boardWidth = useMemo(
    () => Math.max(BOARD_MIN_WIDTH, COLUMN_LEFT_START * 2 + boardColumns.length * COLUMN_STEP),
    [boardColumns.length],
  );

  const maxColumnHeight = useMemo(
  () => Math.max(...boardColumns.map(col => getKanbanColumnHeight((tasksByColumn[col.id] || []).length))),
  [boardColumns, tasksByColumn]
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
    if (!canManageJira) return;

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
    if (!canManageJira) return;

    setModal({
      mode: "edit",
      columnId: task.columnId,
      taskId: task.id,
      values: toKanbanFormValues(task),
    });
  };

  const closeModal = () => setModal(null);

  const handleCardDragStart = (task: KanbanTask) => {
    if (!canManageJira) return;
    setDraggingTask(task);
  };
  const handleCardDragEnd = () => setDraggingTask(null);

  const handleDropTask = async (targetColumnId: KanbanColumnId) => {
    if (!canManageJira) {
      setDraggingTask(null);
      return;
    }

    const task = draggingTask;
    setDraggingTask(null);
    if (!task || task.columnId === targetColumnId) return;
    if (!projectId) return;

    const fromColumnId = task.columnId; // 롤백용 원래 컬럼 기억
    const targetStatusNames =
      boardColumns.find((column) => column.id === targetColumnId)?.statusNames || [];

    // 1) 낙관적 업데이트: 화면에서 먼저 카드 이동
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, columnId: targetColumnId } : item,
      ),
    );

    // 2) 실제 Jira 반영
    try {
      await updateProjectJiraIssueStatus(
        projectId,
        task.code, // Jira issue_key
        targetColumnId,
        targetStatusNames,
      );
    } catch (error) {
      // 3) 실패 시 원래 컬럼으로 롤백
      console.error("Jira 상태 변경 실패:", error);
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, columnId: fromColumnId } : item,
        ),
      );
      alert("Jira 상태 변경에 실패했습니다.");
    }
  };

  const submitTask = async () => {
    if (!canManageJira) return;
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
        {loading ? (
          <div className="absolute left-[68px] top-[72px] text-[14px] font-medium leading-[1.2] text-[#623FB5]">
            Loading Jira board...
          </div>
        ) : null}
        {error ? (
          <div className="absolute left-[68px] top-[72px] text-[14px] font-medium leading-[1.2] text-[#B42318]">
            {error}
          </div>
        ) : null}
        {!canManageJira && !loading && !error ? (
          <div className="absolute left-[68px] top-[72px] text-[14px] font-medium leading-[1.2] text-[#969696]">
            Jira 미연동 계정은 칸반 조회만 가능합니다.
          </div>
        ) : null}
        {boardColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByColumn[column.id]}
            onAddTask={openAddModal}
            onEditTask={openEditModal}
            onCardDragStart={handleCardDragStart}
            onCardDragEnd={handleCardDragEnd}
            onDropTask={handleDropTask}
            draggingTaskId={draggingTask?.id ?? null}
            isDragActive={draggingTask !== null}
            canManage={canManageJira}
            minHeight={maxColumnHeight}
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
