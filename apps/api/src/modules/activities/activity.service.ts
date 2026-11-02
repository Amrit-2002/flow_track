import { prisma } from '../../shared/prisma.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors.js';
import { ActivityDTO, ProjectMemberRole, UserRole } from '@flowtrack/shared';

export class ActivityService {
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
   * Retrieve chronological activity timeline for an issue
   */
  async getIssueActivities(
    user: { id: string; role: UserRole },
    issueId: string
  ): Promise<ActivityDTO[]> {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundError('Issue not found');
    }

    await this.checkProjectAccess(issue.projectId, user.id, user.role);

    const activities = await prisma.activity.findMany({
      where: { issueId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return activities.map((a) => ({
      id: a.id,
      issueId: a.issueId,
      userId: a.userId,
      action: a.action,
      oldValue: a.oldValue,
      newValue: a.newValue,
      createdAt: a.createdAt.toISOString(),
      user: {
        id: a.user.id,
        name: a.user.name,
      },
    }));
  }

  /**
   * Retrieve project-wide activity stream
   */
  async getProjectActivities(
    user: { id: string; role: UserRole },
    projectId: string
  ): Promise<ActivityDTO[]> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    await this.checkProjectAccess(projectId, user.id, user.role);

    const activities = await prisma.activity.findMany({
      where: {
        issue: { projectId },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return activities.map((a) => ({
      id: a.id,
      issueId: a.issueId,
      userId: a.userId,
      action: a.action,
      oldValue: a.oldValue,
      newValue: a.newValue,
      createdAt: a.createdAt.toISOString(),
      user: {
        id: a.user.id,
        name: a.user.name,
      },
    }));
  }
}

export const activityService = new ActivityService();
