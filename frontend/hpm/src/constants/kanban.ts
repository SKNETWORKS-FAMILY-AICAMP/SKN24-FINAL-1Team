import type {
  KanbanCategory,
  KanbanColumnConfig,
  KanbanColumnId,
  KanbanPriority,
  KanbanTask,
  KanbanTaskFormValues,
} from "../types/kanban";

export {
  getCalendarCells,
  parseCalendarDate,
  shiftCalendarMonth,
} from "./calendar";

export const KANBAN_BOARD_MIN_HEIGHT = 780;
export const KANBAN_COLUMN_TOP = 91;
export const KANBAN_COLUMN_BODY_TOP = 51;
export const KANBAN_FIRST_CARD_TOP = 10;
export const KANBAN_CARD_GAP = 160;
export const KANBAN_ADD_BUTTON_BOTTOM_SPACE = 41;
export const KANBAN_BOARD_BOTTOM_SPACE = 80;
export const KANBAN_EMPTY_COLUMN_HEIGHT = 226;

export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  { id: "todo", label: "할 일", left: 68, height: 742 },
  { id: "progress", label: "진행중", left: 452, height: 742 },
  { id: "done", label: "완료", left: 836, height: 742 },
];

export const KANBAN_PRIORITIES: KanbanPriority[] = [
  "매우 낮음",
  "낮음",
  "중간",
  "높음",
  "매우 높음",
];

export const KANBAN_CATEGORIES: KanbanCategory[] = [
  "UI/UX 디자인",
  "서비스 기획",
  "백엔드 로직",
  "고객 요청",
];

const getTodayDate = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const INITIAL_KANBAN_TASKS: KanbanTask[] = [
  {
    id: 1,
    columnId: "todo",
    title: "메인 홈 화면 UI 디자인",
    description: "메인 홈 화면의 레이아웃과 컴포넌트 상태를 정리합니다.",
    category: "UI/UX 디자인",
    dueDate: "2026-04-01",
    startDate: "2026-03-25",
    assignee: "박수영(팀장)",
    priority: "중간",
    code: "APP-04",
    owner: "류지지",
  },
  {
    id: 2,
    columnId: "todo",
    title: "로그인 예외 문구 정리",
    description: "로그인 실패, 계정 잠금, 이메일 형식 오류 문구를 정리합니다.",
    category: "서비스 기획",
    dueDate: "2026-04-01",
    startDate: "2026-03-25",
    assignee: "박수영(팀장)",
    priority: "낮음",
    code: "APP-05",
    owner: "지류지",
  },
  {
    id: 3,
    columnId: "todo",
    title: "알림 삭제 플로우",
    description: "알림 선택 삭제 모드와 카테고리 필터를 연결합니다.",
    category: "서비스 기획",
    dueDate: "2026-04-02",
    startDate: "2026-03-26",
    assignee: "박수영(팀장)",
    priority: "높음",
    code: "APP-06",
    owner: "류우지",
  },
  {
    id: 4,
    columnId: "todo",
    title: "프로젝트 생성 카드",
    description: "프로젝트 생성 카드에서 Jira 연동 화면으로 이동합니다.",
    category: "UI/UX 디자인",
    dueDate: "2026-04-03",
    startDate: "2026-03-27",
    assignee: "박수영(팀장)",
    priority: "중간",
    code: "APP-07",
    owner: "치지직",
  },
  {
    id: 5,
    columnId: "progress",
    title: "Jira 프로젝트 선택",
    description: "Jira 프로젝트는 하나만 선택 가능하도록 처리합니다.",
    category: "백엔드 로직",
    dueDate: "2026-04-01",
    startDate: "2026-03-25",
    assignee: "박수영(팀장)",
    priority: "중간",
    code: "APP-08",
    owner: "류지지",
  },
  {
    id: 6,
    columnId: "progress",
    title: "구성원 검색 등록",
    description: "이름 검색 결과 클릭 시 입력 영역에 구성원 칩을 추가합니다.",
    category: "서비스 기획",
    dueDate: "2026-04-02",
    startDate: "2026-03-26",
    assignee: "박수영(팀장)",
    priority: "높음",
    code: "APP-09",
    owner: "지류지",
  },
  {
    id: 7,
    columnId: "done",
    title: "로그인 기본 화면",
    description: "로그인 화면의 기본 입력 상태를 구현합니다.",
    category: "UI/UX 디자인",
    dueDate: "2026-04-01",
    startDate: "2026-03-25",
    assignee: "박수영(팀장)",
    priority: "매우 낮음",
    code: "APP-01",
    owner: "류지지",
  },
  {
    id: 8,
    columnId: "done",
    title: "첫 로그인 비밀번호 변경",
    description: "처음 로그인한 계정의 비밀번호 변경 화면을 구현합니다.",
    category: "백엔드 로직",
    dueDate: "2026-04-01",
    startDate: "2026-03-25",
    assignee: "박수영(팀장)",
    priority: "낮음",
    code: "APP-02",
    owner: "지류지",
  },
];

export const emptyKanbanForm = (): KanbanTaskFormValues => {
  const today = getTodayDate();

  return {
    title: "",
    description: "",
    category: "",
    dueDate: today,
    startDate: today,
    assignee: "",
    assigneeId: "",
    priority: KANBAN_PRIORITIES[2],
    parentKey: "",
  };
};

export const toKanbanFormValues = (task: KanbanTask): KanbanTaskFormValues => ({
  title: task.title,
  description: task.description,
  category: task.category,
  dueDate: task.dueDate,
  startDate: task.startDate,
  assignee: task.assignee,
  assigneeId: "",
  priority: task.priority,
  parentKey: task.parentKey || "",
});

export const getKanbanColumnHeight = (taskCount: number) => {
  if (taskCount === 0) {
    return KANBAN_EMPTY_COLUMN_HEIGHT;
  }

  return Math.max(
    KANBAN_EMPTY_COLUMN_HEIGHT,
    KANBAN_COLUMN_BODY_TOP +
      KANBAN_FIRST_CARD_TOP +
      taskCount * KANBAN_CARD_GAP +
      KANBAN_ADD_BUTTON_BOTTOM_SPACE,
  );
};

export const getKanbanBoardHeight = (
  tasksByColumn: Record<KanbanColumnId, KanbanTask[]>,
  columns: KanbanColumnConfig[] = KANBAN_COLUMNS,
) => {
  const maxColumnHeight = Math.max(
    ...columns.map((column) =>
      getKanbanColumnHeight(tasksByColumn[column.id].length),
    ),
  );

  return Math.max(
    KANBAN_BOARD_MIN_HEIGHT,
    KANBAN_COLUMN_TOP + maxColumnHeight + KANBAN_BOARD_BOTTOM_SPACE,
  );
};
