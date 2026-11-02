import { z } from 'zod';
import { UserRole, ProjectMemberRole, IssueType, IssuePriority, ThemePreference, TaskDevStatus } from '../constants/index.js';

// ==========================================
// Auth & User Schemas
// ==========================================

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: z.nativeEnum(UserRole).optional().default(UserRole.USER),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(255).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateThemeSchema = z.object({
  theme: z.nativeEnum(ThemePreference),
});

export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;

// ==========================================
// Project Schemas
// ==========================================

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(100),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Key must be at least 2 characters')
    .max(10, 'Key cannot exceed 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Key must be uppercase alphanumeric characters only'),
  description: z.string().trim().max(1000).optional().nullable(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  isArchived: z.boolean().optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const addProjectMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  role: z.nativeEnum(ProjectMemberRole).default(ProjectMemberRole.MEMBER),
});

export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;

// ==========================================
// Issue Schemas
// ==========================================

export const createIssueSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  parentId: z.string().uuid('Invalid parent issue ID').optional().nullable(),
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().trim().max(10000).optional().nullable(),
  type: z.nativeEnum(IssueType).default(IssueType.TASK),
  priority: z.nativeEnum(IssuePriority).default(IssuePriority.MEDIUM),
  statusId: z.string().uuid('Invalid status ID'),
  assigneeId: z.string().uuid('Invalid assignee ID').optional().nullable(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

export const updateIssueSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(10000).optional().nullable(),
  type: z.nativeEnum(IssueType).optional(),
  priority: z.nativeEnum(IssuePriority).optional(),
  statusId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
});

export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;

export const updateIssueStatusSchema = z.object({
  statusId: z.string().uuid('Invalid target status ID'),
});

export type UpdateIssueStatusInput = z.infer<typeof updateIssueStatusSchema>;

export const updateIssueFieldSchema = z.object({
  field: z.enum(['title', 'priority', 'type', 'assigneeId', 'description']),
  value: z.unknown(),
});

export type UpdateIssueFieldInput = z.infer<typeof updateIssueFieldSchema>;

// ==========================================
// Workflow Schemas
// ==========================================

export const createStatusSchema = z.object({
  name: z.string().trim().min(2).max(50),
  order: z.number().int().min(1),
});

export type CreateStatusInput = z.infer<typeof createStatusSchema>;

export const createTransitionSchema = z.object({
  fromStatusId: z.string().uuid(),
  toStatusId: z.string().uuid(),
});

export type CreateTransitionInput = z.infer<typeof createTransitionSchema>;

// ==========================================
// Comment & TimeLog Schemas
// ==========================================

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(5000),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const createTimeLogSchema = z.object({
  timeSpent: z.number().int().min(1, 'Time spent must be at least 1 minute'),
  description: z.string().trim().max(500).optional().nullable(),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export type CreateTimeLogInput = z.infer<typeof createTimeLogSchema>;

// ==========================================
// Saved Filter Schemas
// ==========================================

export const createSavedFilterSchema = z.object({
  name: z.string().trim().min(1, 'Filter name is required').max(100),
  filterData: z.record(z.unknown()),
});

export type CreateSavedFilterInput = z.infer<typeof createSavedFilterSchema>;

// ==========================================
// Client & Legacy Task Schemas
// ==========================================

export const createClientSchema = z.object({
  name: z.string().trim().min(1, 'Client name is required').max(200),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  name: z.string().trim().min(1, 'Client name is required').max(200),
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const createTaskSchema = z.object({
  client: z.string().trim().min(1, 'Client is required').max(200),
  taskBugName: z.string().trim().min(1, 'Task/Bug name is required').max(255),
  owner: z.string().trim().min(1, 'Owner is required').max(255),
  priority: z.enum(['Low', 'Medium', 'High']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  devStatus: z.nativeEnum(TaskDevStatus),
  unitTestStatus: z.nativeEnum(TaskDevStatus),
  stagingStatus: z.nativeEnum(TaskDevStatus),
  prodStatus: z.nativeEnum(TaskDevStatus),
  comment: z.string().trim().max(2000).optional().nullable(),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  client: z.string().trim().min(1).max(200).optional(),
  taskBugName: z.string().trim().min(1).max(255).optional(),
  owner: z.string().trim().min(1).max(255).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  devStatus: z.nativeEnum(TaskDevStatus).optional(),
  unitTestStatus: z.nativeEnum(TaskDevStatus).optional(),
  stagingStatus: z.nativeEnum(TaskDevStatus).optional(),
  prodStatus: z.nativeEnum(TaskDevStatus).optional(),
  comment: z.string().trim().max(2000).optional().nullable(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

