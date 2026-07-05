export type Role =
  | "ADMIN"
  | "MANAGER"
  | "SCRUM_MASTER"
  | "PRODUCT_OWNER"
  | "DEVELOPER"
  | "CLIENT"
  | "GUEST";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type WorkItemKind = "EPIC" | "STORY" | "FEATURE" | "TASK" | "BUG" | "HOTFIX";
export type WorkStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "TESTING" | "BLOCKED" | "DONE";

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  title?: string | null;
  department?: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  progress: number;
  status: string;
  owner: UserSummary;
}

export interface WorkItem {
  id: string;
  title: string;
  description?: string;
  kind: WorkItemKind;
  status: WorkStatus;
  priority: Priority;
  estimatedMinutes?: number;
  spentMinutes?: number;
  assignee?: UserSummary | null;
  dueDate?: string | null;
  tags: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
}
