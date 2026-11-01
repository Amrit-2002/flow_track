import { prisma } from '../../shared/prisma';
import { UserRole, IssueType, DashboardStatsDTO, ActivityDTO } from '@flowtrack/shared';
import { ForbiddenError, NotFoundError } from '../../shared/errors';
import { Prisma } from '@prisma/client';

export class DashboardService {
  async getStats(
    user: { id: string; role: UserRole },
    projectId?: string
  ): Promise<DashboardStatsDTO> {
    // 1. Determine Issue Filter based on Role and Project Scope
    let issueFilter: Prisma.IssueWhereInput = {};

    if (projectId) {
      // Check if project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true },
      });

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Check permission: global ADMIN can view, otherwise must be a project member
      if (user.role !== UserRole.ADMIN) {
        const isMember = project.members.some((m) => m.userId === user.id);
        if (!isMember) {
          throw new ForbiddenError('You do not have access to view this project dashboard');
        }
      }

      issueFilter = { projectId };
    } else {
      // Global scope:
      // ADMIN and MANAGER can see all issues across the platform
      // USER can only see issues within projects they belong to
      if (user.role === UserRole.USER) {
        const userMemberships = await prisma.projectMember.findMany({
          where: { userId: user.id },
          select: { projectId: true },
        });

        const allowedProjectIds = userMemberships.map((m) => m.projectId);
        issueFilter = {
          projectId: { in: allowedProjectIds },
        };
      }
    }

    // 2. Fetch all statuses for consistent ordering & mapping
    const allStatuses = await prisma.status.findMany({
      orderBy: { order: 'asc' },
    });

    // 3. Total issues count
    const totalIssues = await prisma.issue.count({
      where: issueFilter,
    });

    // 4. Issues by status
    const statusGroups = await prisma.issue.groupBy({
      by: ['statusId'],
      where: issueFilter,
      _count: { id: true },
    });

    const statusCountMap = new Map<string, number>();
    for (const group of statusGroups) {
      statusCountMap.set(group.statusId, group._count.id);
    }

    const issuesByStatus = allStatuses.map((s) => ({
      statusId: s.id,
      statusName: s.name,
      count: statusCountMap.get(s.id) || 0,
    }));

    // 5. Issues by type
    const typeGroups = await prisma.issue.groupBy({
      by: ['type'],
      where: issueFilter,
      _count: { id: true },
    });

    const issuesByType = typeGroups.map((g) => ({
      type: g.type as IssueType,
      count: g._count.id,
    }));

    // 6. Issues by user (Top 10 assignees)
    const userGroups = await prisma.issue.groupBy({
      by: ['assigneeId'],
      where: {
        ...issueFilter,
        assigneeId: { not: null },
      },
      _count: { id: true },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    const assigneeIds = userGroups
      .map((g) => g.assigneeId)
      .filter((id): id is string => id !== null);

    const assignees = assigneeIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, name: true },
        })
      : [];

    const assigneeNameMap = new Map<string, string>();
    assignees.forEach((u) => assigneeNameMap.set(u.id, u.name));

    const issuesByUser = userGroups.map((g) => ({
      userId: g.assigneeId!,
      userName: assigneeNameMap.get(g.assigneeId!) || 'Unknown',
      count: g._count.id,
    }));

    // 7. Time tracking aggregates
    const timeAggregation = await prisma.timeLog.aggregate({
      _sum: { timeSpent: true },
      where: {
        issue: issueFilter,
      },
    });

    const totalTimeMinutes = timeAggregation._sum.timeSpent || 0;
    const avgTimePerIssueMinutes =
      totalIssues > 0 ? Math.round(totalTimeMinutes / totalIssues) : 0;

    // 8. Bottleneck Status Detection
    // Status with the highest issue count that is not 'Done' or 'Closed'
    const nonDoneStatuses = issuesByStatus.filter(
      (s) => !['done', 'closed', 'completed'].includes(s.statusName.toLowerCase())
    );
    const sortedBottlenecks = [...nonDoneStatuses].sort((a, b) => b.count - a.count);
    const bottleneckStatus =
      sortedBottlenecks.length > 0 && sortedBottlenecks[0].count > 0
        ? sortedBottlenecks[0]
        : null;

    // 9. Most active user by time logging count
    const activeUserGroup = await prisma.timeLog.groupBy({
      by: ['userId'],
      where: {
        issue: issueFilter,
      },
      _count: { id: true },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 1,
    });

    let mostActiveUser: {
      userId: string;
      userName: string;
      timeLogsCount: number;
    } | null = null;

    if (activeUserGroup.length > 0) {
      const topUserId = activeUserGroup[0].userId;
      const topUser = await prisma.user.findUnique({
        where: { id: topUserId },
        select: { id: true, name: true },
      });

      if (topUser) {
        mostActiveUser = {
          userId: topUser.id,
          userName: topUser.name,
          timeLogsCount: activeUserGroup[0]._count.id,
        };
      }
    }

    // 10. Recent Activity Log (Top 10)
    const recentActivitiesRaw = await prisma.activity.findMany({
      where: {
        issue: issueFilter,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const recentActivities: ActivityDTO[] = recentActivitiesRaw.map((a) => ({
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

    return {
      totalIssues,
      issuesByStatus,
      issuesByType,
      issuesByUser,
      totalTimeMinutes,
      avgTimePerIssueMinutes,
      bottleneckStatus,
      mostActiveUser,
      recentActivities,
    };
  }
}

export const dashboardService = new DashboardService();
