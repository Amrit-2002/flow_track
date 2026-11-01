export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  USER: 'USER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ProjectMemberRole = {
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const;

export type ProjectMemberRole = (typeof ProjectMemberRole)[keyof typeof ProjectMemberRole];

export const IssueType = {
  BUG: 'BUG',
  TASK: 'TASK',
  FEATURE: 'FEATURE',
} as const;

export type IssueType = (typeof IssueType)[keyof typeof IssueType];

export const IssuePriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type IssuePriority = (typeof IssuePriority)[keyof typeof IssuePriority];

export const DefaultStatus = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
} as const;

export type DefaultStatus = (typeof DefaultStatus)[keyof typeof DefaultStatus];

export const TaskDevStatus = {
  NEW: 'New',
  IN_PROGRESS: 'In-progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On-hold',
  NA: 'NA',
} as const;

export type TaskDevStatus = (typeof TaskDevStatus)[keyof typeof TaskDevStatus];

export const ThemePreference = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export type ThemePreference = (typeof ThemePreference)[keyof typeof ThemePreference];
