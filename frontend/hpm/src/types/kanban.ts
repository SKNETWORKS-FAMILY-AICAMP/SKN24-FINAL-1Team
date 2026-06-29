export type KanbanColumnId = string;

export type KanbanPriority = "매우 낮음" | "낮음" | "중간" | "높음" | "매우 높음";

export type KanbanCategory = string;

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
  parentKey?: string;
  issueType?: string;
  issueTypeIconUrl?: string;
  issueTypeHierarchyLevel?: number | null;
}

export interface KanbanTaskFormValues {
  title: string;
  description: string;
  category: KanbanCategory;
  dueDate: string;
  startDate: string;
  assignee: string;
  assigneeId: string;
  priority: KanbanPriority | "";
  parentKey: string;
}

export interface KanbanColumnConfig {
  id: KanbanColumnId;
  label: string;
  left: number;
  height: number;
  statusNames?: string[];
}

export interface KanbanModalState {
  mode: "add" | "edit";
  columnId: KanbanColumnId;
  taskId?: number;
  values: KanbanTaskFormValues;
}
