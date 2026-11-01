import { UserRole, ProjectMemberRole, IssueType, IssuePriority, ThemePreference } from '../constants';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  themePreference: ThemePreference;
  createdAt: string;
}

export interface ProjectDTO {
  id: string;
  name: string;
  key: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    issues: number;
    members: number;
  };
}

export interface ProjectMemberDTO {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  user: UserDTO;
  createdAt: string;
}

export interface StatusDTO {
  id: string;
  name: string;
  order: number;
}

export interface WorkflowTransitionDTO {
  id: string;
  fromStatusId: string;
  toStatusId: string;
  fromStatus?: StatusDTO;
  toStatus?: StatusDTO;
}

export interface AttachmentDTO {
  id: string;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  userId: string;
  user?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface CommentDTO {
  id: string;
  issueId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: UserDTO;
  attachments?: AttachmentDTO[];
}

export interface TimeLogDTO {
  id: string;
  issueId: string;
  userId: string;
  timeSpent: number; // in minutes
  description: string | null;
  logDate: string;
  createdAt: string;
  user: UserDTO;
}

export interface ActivityDTO {
  id: string;
  issueId: string;
  userId: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

export interface IssueDTO {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  type: IssueType;
  priority: IssuePriority;
  statusId: string;
  assigneeId: string | null;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
  status?: StatusDTO;
  assignee?: UserDTO | null;
  reporter?: UserDTO;
  project?: ProjectDTO;
  parent?: {
    id: string;
    title: string;
  } | null;
  children?: IssueDTO[];
  comments?: CommentDTO[];
  attachments?: AttachmentDTO[];
  timeLogs?: TimeLogDTO[];
  activities?: ActivityDTO[];
  _count?: {
    comments: number;
    attachments: number;
    timeLogs: number;
    children: number;
  };
}

export interface KanbanColumnDTO {
  status: StatusDTO;
  issues: IssueDTO[];
}

export interface DashboardStatsDTO {
  totalIssues: number;
  issuesByStatus: {
    statusId: string;
    statusName: string;
    count: number;
  }[];
  issuesByType: {
    type: IssueType;
    count: number;
  }[];
  issuesByUser: {
    userId: string;
    userName: string;
    count: number;
  }[];
  totalTimeMinutes: number;
  avgTimePerIssueMinutes: number;
  bottleneckStatus: {
    statusId: string;
    statusName: string;
    count: number;
  } | null;
  mostActiveUser: {
    userId: string;
    userName: string;
    timeLogsCount: number;
  } | null;
}

export interface NotificationDTO {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface SavedFilterDTO {
  id: string;
  userId: string;
  name: string;
  filterData: Record<string, unknown>;
  createdAt: string;
}

export interface ClientDTO {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export interface TaskDTO {
  id: string;
  userId: string;
  client: string;
  taskBugName: string;
  owner: string;
  priority: string;
  startDate: string;
  endDate: string;
  devStatus: string;
  unitTestStatus: string;
  stagingStatus: string;
  prodStatus: string;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

