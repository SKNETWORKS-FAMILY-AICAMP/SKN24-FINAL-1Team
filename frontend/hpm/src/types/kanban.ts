export type KanbanColumnId = "todo" | "progress" | "review" | "done";

export type KanbanPriority = "매우 낮음" | "낮음" | "중간" | "높음" | "매우 높음";

export type KanbanCategory = "UI/UX 디자인" | "서비스 기획" | "백엔드 로직" | "고객 요청";

export interface KanbanTask {
  id: number;
  columnId: KanbanColumnId;
  title: string;
  description: string;
  category: KanbanCategory;
  dueDate: string;
  startDate: string;
  assignee: string;
  priority: KanbanPriority;
  code: string;
  owner: string;
}

export interface KanbanTaskFormValues {
  title: string;
  description: string;
  category: KanbanCategory;
  dueDate: string;
  startDate: string;
  assignee: string;
  priority: KanbanPriority | "";
}

export interface KanbanColumnConfig {
  id: KanbanColumnId;
  label: string;
  left: number;
  height: number;
}

export interface KanbanModalState {
  mode: "add" | "edit";
  columnId: KanbanColumnId;
  taskId?: number;
  values: KanbanTaskFormValues;
}
