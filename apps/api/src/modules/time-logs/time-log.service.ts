import { prisma } from '../../shared/prisma.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors.js';
import {
  CreateTimeLogInput,
  ProjectMemberRole,
  ThemePreference,
  TimeLogDTO,
  TimeLogsResponseDTO,
  UserRole,
} from '@flowtrack/shared';

export class TimeLogService {
  /**
   * Helper to verify project membership access
   */
  private async checkProjectAccess(
    projectId: string,
    userId: string,
    userRole: UserRole
  ) {
    if (userRole === UserRole.ADMIN || userRole === UserRole.MANAGER) {
      return { role: ProjectMemberRole.ADMIN };
    }

    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenError('You do not have access to this project');
    }

    return member;
  }

  /**
   * Create a new work log entry for an issue and audit the activity
   */
  async createTimeLog(
    user: { id: string; role: UserRole },
    issueId: string,
    input: CreateTimeLogInput
  ): Promise<TimeLogDTO> {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundError('Issue not found');
    }

    await this.checkProjectAccess(issue.projectId, user.id, user.role);

    return prisma.$transaction(async (tx) => {
      const log = await tx.timeLog.create({
        data: {
          issueId,
          userId: user.id,
          timeSpent: input.timeSpent,
          description: input.description?.trim() || null,
          logDate: new Date(input.logDate),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              themePreference: true,
              createdAt: true,
            },
          },
        },
      });

      // Record atomic activity audit log
      await tx.activity.create({
        data: {
          issueId,
          userId: user.id,
          action: 'TIME_LOGGED',
          newValue: `${input.timeSpent} minutes${input.description ? ` (${input.description.trim()})` : ''}`,
        },
      });

      return {
        id: log.id,
        issueId: log.issueId,
        userId: log.userId,
        timeSpent: log.timeSpent,
        description: log.description,
        logDate: log.logDate.toISOString().split('T')[0],
        createdAt: log.createdAt.toISOString(),
        user: {
          id: log.user.id,
          name: log.user.name,
          email: log.user.email,
          role: log.user.role as UserRole,
          themePreference: (log.user.themePreference || 'SYSTEM') as ThemePreference,
          createdAt: log.user.createdAt.toISOString(),
        },
      };
    });
  }

  /**
   * List all time logs for a given issue and compute total minutes logged
   */
  async listTimeLogs(
    user: { id: string; role: UserRole },
    issueId: string
  ): Promise<TimeLogsResponseDTO> {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundError('Issue not found');
    }

    await this.checkProjectAccess(issue.projectId, user.id, user.role);

    const logs = await prisma.timeLog.findMany({
      where: { issueId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            themePreference: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { logDate: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const totalMinutes = logs.reduce((acc, curr) => acc + curr.timeSpent, 0);

    const timeLogs: TimeLogDTO[] = logs.map((log) => ({
      id: log.id,
      issueId: log.issueId,
      userId: log.userId,
      timeSpent: log.timeSpent,
      description: log.description,
      logDate: log.logDate.toISOString().split('T')[0],
      createdAt: log.createdAt.toISOString(),
      user: {
        id: log.user.id,
        name: log.user.name,
        email: log.user.email,
        role: log.user.role as UserRole,
        themePreference: (log.user.themePreference || 'SYSTEM') as ThemePreference,
        createdAt: log.user.createdAt.toISOString(),
      },
    }));

    return {
      timeLogs,
      totalMinutes,
    };
  }

  /**
   * Delete a work log entry
   */
  async deleteTimeLog(
    user: { id: string; role: UserRole },
    id: string
  ): Promise<void> {
    const existing = await prisma.timeLog.findUnique({
      where: { id },
      include: {
        issue: true,
      },
    });

    if (!existing) {
      throw new NotFoundError('Time log not found');
    }

    const isAuthor = existing.userId === user.id;
    const isGlobalAdmin = user.role === UserRole.ADMIN;

    if (!isAuthor && !isGlobalAdmin && existing.issue) {
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: existing.issue.projectId,
            userId: user.id,
          },
        },
      });

      if (!member || member.role !== ProjectMemberRole.ADMIN) {
        throw new ForbiddenError('You do not have permission to delete this time log');
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.timeLog.delete({
        where: { id },
      });

      await tx.activity.create({
        data: {
          issueId: existing.issueId,
          userId: user.id,
          action: 'TIME_LOG_DELETED',
          oldValue: `${existing.timeSpent} minutes`,
        },
      });
    });
  }
}

export const timeLogService = new TimeLogService();

