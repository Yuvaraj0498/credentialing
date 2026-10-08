// Response types for /api/tasks (docs/api/operations.md §1).

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "open" | "in_progress" | "done";

export interface TaskRow {
  id: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  overdue: boolean;
  providerId: number | null;
  providerName: string | null;
  assigneeUserId: number | null;
  assigneeName: string | null;
  createdBy: number | null;
  createdByName: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCounts {
  open: number;
  inProgress: number;
  done: number;
  all: number;
  overdue: number;
}

export interface TaskListResponse {
  items: TaskRow[];
  counts: TaskCounts;
}

export interface ProviderLite {
  id: number;
  name: string;
  npi: string | null;
  specialty: string | null;
  status: string;
  locationId: number | null;
}
