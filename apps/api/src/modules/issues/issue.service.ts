import { prisma } from '../../shared/prisma';
import { workflowService } from '../workflows/workflow.service.js';
import {
  CreateIssueInput,
  UpdateIssueInput,
  IssueDTO,
  IssuePriority,
  IssueType,
  PaginatedResponse,
  ProjectDTO,
  ProjectMemberRole,
  ThemePreference,
  UserDTO,
  UserRole,
} from '@flowtrack/shared';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors';
import { Prisma } from '@prisma/client';

function formatProject(p: any): ProjectDTO | undefined {
  if (!p) return undefined;
  return {
    id: p.id,
    name: p.name,
    key: p.key,
    description: p.description ?? null,
    isArchived: p.isArchived,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}

function formatUser(u: any): UserDTO | null {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as UserRole,
    themePreference: (u.themePreference as ThemePreference) || ThemePreference.LIGHT,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
  };
}

export interface ListIssuesFilter {
  page?: number;
  limit?: number;
  projectId?: string;
  statusId?: string;
  priority?: IssuePriority;
  type?: IssueType;
  assigneeId?: string;
  parentId?: string | null;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export class IssueService {
  /**
   * Helper to verify if the requesting user has access to a project
   */
  async checkProjectAccess(
    projectId: string,
    userId: string,
    userRole: UserRole
  ) {
    if (userRole === UserRole.ADMIN) {
      return { role: ProjectMemberRole.ADMIN };
    }

    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenError('You do not have access to this project');
    }

    return membership;
  }

  /**
   * List issues with filtering, full-text search, and pagination
   */
  async listIssues(
    user: { id: string; role: UserRole },
    filter: ListIssuesFilter = {}
  ): Promise<PaginatedResponse<IssueDTO>> {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.IssueWhereInput = {};

    // 1. Scoping by Project
    if (filter.projectId) {
      await this.checkProjectAccess(filter.projectId, user.id, user.role);
      where.projectId = filter.projectId;
    } else {
      // If user is a standard USER, only show issues from projects they are members of
      if (user.role === UserRole.USER) {
        const memberships = await prisma.projectMember.findMany({
          where: { userId: user.id },
          select: { projectId: true },
        });
        const projectIds = memberships.map((m) => m.projectId);
        where.projectId = { in: projectIds };
      }
    }

    // 2. Additional Filters
    if (filter.statusId) {
      where.statusId = filter.statusId;
    }

    if (filter.priority) {
      where.priority = filter.priority;
    }

    if (filter.type) {
      where.type = filter.type;
    }

    if (filter.assigneeId) {
      where.assigneeId = filter.assigneeId;
    }

    if (filter.parentId !== undefined) {
      if (filter.parentId === 'null' || filter.parentId === null) {
        where.parentId = null;
      } else {
        where.parentId = filter.parentId;
      }
    }

    // 3. Search query across title and description
    if (filter.search && filter.search.trim()) {
      const searchKeyword = filter.search.trim();
      where.OR = [
        { title: { contains: searchKeyword, mode: 'insensitive' } },
        { description: { contains: searchKeyword, mode: 'insensitive' } },
      ];
    }

    const sortBy = filter.sortBy || 'createdAt';
    const sortOrder = filter.sortOrder || 'desc';

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          project: {
            select: { id: true, name: true, key: true, description: true, isArchived: true, createdAt: true, updatedAt: true },
          },
          status: {
            select: { id: true, name: true, order: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, role: true, themePreference: true, createdAt: true },
          },
          reporter: {
            select: { id: true, name: true, email: true, role: true, themePreference: true, createdAt: true },
          },
          parent: {
            select: { id: true, title: true },
          },
          _count: {
            select: {
              comments: true,
              attachments: true,
              timeLogs: true,
              children: true,
            },
          },
        },
      }),
      prisma.issue.count({ where }),
    ]);

    const formattedIssues: IssueDTO[] = issues.map((i) => ({
      id: i.id,
      projectId: i.projectId,
      parentId: i.parentId,
      title: i.title,
      description: i.description,
      type: i.type as IssueType,
      priority: i.priority as IssuePriority,
      statusId: i.statusId,
      assigneeId: i.assigneeId,
      reporterId: i.reporterId,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
      project: formatProject(i.project),
      status: i.status,
      assignee: formatUser(i.assignee),
      reporter: formatUser(i.reporter)!,
      parent: i.parent,
      _count: i._count,
    }));

    return {
      success: true,
      data: formattedIssues,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single issue by ID with full relations and subtasks
   */
  async getIssueById(
    user: { id: string; role: UserRole },
    id: string
  ): Promise<IssueDTO> {
    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, key: true, description: true, isArchived: true, createdAt: true, updatedAt: true },
        },
        status: {
          select: { id: true, name: true, order: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, role: true, themePreference: true, createdAt: true },
        },
        reporter: {
          select: { id: true, name: true, email: true, role: true, themePreference: true, createdAt: true },
        },
        parent: {
          select: { id: true, title: true },
        },
        children: {
          include: {
            status: { select: { id: true, name: true, order: true } },
            assignee: { select: { id: true, name: true, email: true, role: true, themePreference: true, createdAt: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
            timeLogs: true,
            children: true,
          },
        },
      },
    });

    if (!issue) {
      throw new NotFoundError('Issue not found');
    }

    await this.checkProjectAccess(issue.projectId, user.id, user.role);

    return {
      id: issue.id,
      projectId: issue.projectId,
      parentId: issue.parentId,
      title: issue.title,
      description: issue.description,
      type: issue.type as IssueType,
      priority: issue.priority as IssuePriority,
      statusId: issue.statusId,
      assigneeId: issue.assigneeId,
      reporterId: issue.reporterId,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
      project: formatProject(issue.project),
      status: issue.status,
      assignee: formatUser(issue.assignee),
      reporter: formatUser(issue.reporter)!,
      parent: issue.parent,
      attachments: (issue.attachments || []).map((a: any) => ({
        id: a.id,
        fileName: a.fileName,
        fileKey: a.fileKey,
        fileUrl: a.fileUrl,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        userId: a.userId,
        createdAt: a.createdAt.toISOString(),
      })),
      children: (issue.children || []).map((c) => ({
        id: c.id,
        projectId: c.projectId,
        parentId: c.parentId,
        title: c.title,
        description: c.description,
        type: c.type as IssueType,
        priority: c.priority as IssuePriority,
        statusId: c.statusId,
        assigneeId: c.assigneeId,
        reporterId: c.reporterId,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        status: c.status,
        assignee: formatUser(c.assignee),
      })),
      _count: issue._count,
    };
  }

  /**
   * Create an issue or subtask
   */
  async createIssue(
    user: { id: string; role: UserRole },
    data: CreateIssueInput
  ): Promise<IssueDTO> {
    // 1. Verify project access
    await this.checkProjectAccess(data.projectId, user.id, user.role);

    // 2. Verify status exists
    const status = await prisma.status.findUnique({
      where: { id: data.statusId },
    });
    if (!status) {
      throw new NotFoundError('Target status does not exist');
    }

    // 3. If parentId provided, verify parent exists in the same project
    if (data.parentId) {
      const parentIssue = await prisma.issue.findUnique({
        where: { id: data.parentId },
      });
      if (!parentIssue) {
        throw new NotFoundError('Parent issue not found');
      }
      if (parentIssue.projectId !== data.projectId) {
        throw new BadRequestError('Subtask must belong to the same project as its parent');
      }
    }

    // 4. Verify assignee (if provided) is a member of the project
    if (data.assigneeId) {
      const assigneeMembership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: data.projectId,
            userId: data.assigneeId,
          },
        },
      });
      if (!assigneeMembership) {
        throw new BadRequestError('Assignee must be an active member of this project');
      }
    }

    // 5. Create the issue
    const newIssue = await prisma.issue.create({
      data: {
        projectId: data.projectId,
        parentId: data.parentId || null,
        title: data.title,
        description: data.description || null,
        type: data.type,
        priority: data.priority,
        statusId: data.statusId,
        assigneeId: data.assigneeId || null,
        reporterId: user.id,
      },
      include: {
        project: {
          select: { id: true, name: true, key: true, description: true, isArchived: true, createdAt: true, updatedAt: true },
        },
        status: {
          select: { id: true, name: true, order: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, role: true, themePreference: true, createdAt: true },
        },
        reporter: {
          select: { id: true, name: true, email: true, role: true, themePreference: true, createdAt: true },
        },
      },
    });

    // 6. Record activity audit
    await prisma.activity.create({
      data: {
        issueId: newIssue.id,
        userId: user.id,
        action: 'CREATED',
        newValue: newIssue.title,
      },
    });

    return {
      id: newIssue.id,
      projectId: newIssue.projectId,
      parentId: newIssue.parentId,
      title: newIssue.title,
      description: newIssue.description,
      type: newIssue.type as IssueType,
      priority: newIssue.priority as IssuePriority,
      statusId: newIssue.statusId,
      assigneeId: newIssue.assigneeId,
      reporterId: newIssue.reporterId,
      createdAt: newIssue.createdAt.toISOString(),
      updatedAt: newIssue.updatedAt.toISOString(),
      project: formatProject(newIssue.project),
      status: newIssue.status,
      assignee: formatUser(newIssue.assignee),
      reporter: formatUser(newIssue.reporter)!,
    };
  }

  /**
   * Update an issue with audit trail generation
   */
  async updateIssue(
    user: { id: string; role: UserRole },
    id: string,
    data: UpdateIssueInput
  ): Promise<IssueDTO> {
    const existing = await prisma.issue.findUnique({
      where: { id },
      include: {
        status: true,
        assignee: true,
      },
    });

    if (!existing) {
      throw new NotFoundError('Issue not found');
    }

    const membership = await this.checkProjectAccess(existing.projectId, user.id, user.role);

    // Permission: Project ADMIN, global ADMIN/MANAGER, reporter, or assignee can edit
    const isProjectAdmin = membership.role === ProjectMemberRole.ADMIN;
    const isGlobalPrivileged = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    const isReporterOrAssignee = existing.reporterId === user.id || existing.assigneeId === user.id;

    if (!isProjectAdmin && !isGlobalPrivileged && !isReporterOrAssignee) {
      throw new ForbiddenError('You do not have permission to edit this issue');
    }

    // Hierarchy safeguard: cannot set issue as its own parent
    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw new BadRequestError('An issue cannot be its own parent');
      }
      if (data.parentId) {
        const parent = await prisma.issue.findUnique({ where: { id: data.parentId } });
        if (!parent) {
          throw new NotFoundError('Parent issue not found');
        }
        if (parent.projectId !== existing.projectId) {
          throw new BadRequestError('Parent issue must belong to the same project');
        }
      }
    }

    // Verify assignee if changing
    if (data.assigneeId !== undefined && data.assigneeId !== null) {
      const assigneeMembership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: existing.projectId,
            userId: data.assigneeId,
          },
        },
      });
      if (!assigneeMembership) {
        throw new BadRequestError('Assignee must be an active member of this project');
      }
    }

    // Prepare activity logs
    const activities: Prisma.ActivityCreateManyInput[] = [];

    if (data.title && data.title !== existing.title) {
      activities.push({
        issueId: id,
        userId: user.id,
        action: 'TITLE_CHANGED',
        oldValue: existing.title,
        newValue: data.title,
      });
    }

    if (data.priority && data.priority !== existing.priority) {
      activities.push({
        issueId: id,
        userId: user.id,
        action: 'PRIORITY_CHANGED',
        oldValue: existing.priority,
        newValue: data.priority,
      });
    }

    if (data.type && data.type !== existing.type) {
      activities.push({
        issueId: id,
        userId: user.id,
        action: 'TYPE_CHANGED',
        oldValue: existing.type,
        newValue: data.type,
      });
    }

    if (data.statusId && data.statusId !== existing.statusId) {
      const { fromStatusName, toStatusName } = await workflowService.validateTransition(
        existing.statusId,
        data.statusId
      );
      activities.push({
        issueId: id,
        userId: user.id,
        action: 'STATUS_CHANGED',
        oldValue: fromStatusName,
        newValue: toStatusName,
      });
    }

    if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
      activities.push({
        issueId: id,
        userId: user.id,
        action: 'ASSIGNEE_CHANGED',
        oldValue: existing.assignee?.name || 'Unassigned',
        newValue: data.assigneeId ? 'Assigned' : 'Unassigned',
      });
    }

    // Execute update and log activities in transaction
    const [updated] = await prisma.$transaction([
      prisma.issue.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          type: data.type,
          priority: data.priority,
          statusId: data.statusId,
          assigneeId: data.assigneeId,
          parentId: data.parentId,
        },
        include: {
          project: {
            select: { id: true, name: true, key: true, description: true, isArchived: true, createdAt: true, updatedAt: true },
          },
          status: {
            select: { id: true, name: true, order: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, role: true, themePreference: true, createdAt: true },
          },
          reporter: {
            select: { id: true, name: true, email: true, role: true, themePreference: true, createdAt: true },
          },
          parent: {
            select: { id: true, title: true },
          },
        },
      }),
      ...(activities.length > 0
        ? [prisma.activity.createMany({ data: activities })]
        : []),
    ]);

    return {
      id: updated.id,
      projectId: updated.projectId,
      parentId: updated.parentId,
      title: updated.title,
      description: updated.description,
      type: updated.type as IssueType,
      priority: updated.priority as IssuePriority,
      statusId: updated.statusId,
      assigneeId: updated.assigneeId,
      reporterId: updated.reporterId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      project: formatProject(updated.project),
      status: updated.status,
      assignee: formatUser(updated.assignee),
      reporter: formatUser(updated.reporter)!,
      parent: updated.parent,
    };
  }

  /**
   * Transition an issue's status through the workflow state machine
   */
  async transitionIssue(
    user: { id: string; role: UserRole },
    id: string,
    targetStatusId: string
  ): Promise<IssueDTO> {
    const existing = await prisma.issue.findUnique({
      where: { id },
      include: {
        status: true,
        assignee: true,
      },
    });

    if (!existing) {
      throw new NotFoundError('Issue not found');
    }

    const membership = await this.checkProjectAccess(existing.projectId, user.id, user.role);

    // Permission: Project ADMIN, global ADMIN/MANAGER, reporter, or assignee can transition
    const isProjectAdmin = membership.role === ProjectMemberRole.ADMIN;
    const isGlobalPrivileged = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    const isReporterOrAssignee = existing.reporterId === user.id || existing.assigneeId === user.id;

    if (!isProjectAdmin && !isGlobalPrivileged && !isReporterOrAssignee) {
      throw new ForbiddenError('You do not have permission to transition this issue');
    }

    if (existing.statusId === targetStatusId) {
      return this.getIssueById(user, id);
    }

    // Validate workflow transition rules (throws 422 UnprocessableEntityError if not permitted)
    const { fromStatusName, toStatusName } = await workflowService.validateTransition(
      existing.statusId,
      targetStatusId
    );

    // Atomically update status and record activity
    const [updated] = await prisma.$transaction([
      prisma.issue.update({
        where: { id },
        data: { statusId: targetStatusId },
        include: {
          project: true,
          status: true,
          assignee: true,
          reporter: true,
        },
      }),
      prisma.activity.create({
        data: {
          issueId: id,
          userId: user.id,
          action: 'STATUS_CHANGED',
          oldValue: fromStatusName,
          newValue: toStatusName,
        },
      }),
    ]);

    return {
      id: updated.id,
      projectId: updated.projectId,
      parentId: updated.parentId,
      title: updated.title,
      description: updated.description,
      type: updated.type as IssueType,
      priority: updated.priority as IssuePriority,
      statusId: updated.statusId,
      assigneeId: updated.assigneeId,
      reporterId: updated.reporterId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      project: formatProject(updated.project),
      status: updated.status,
      assignee: formatUser(updated.assignee),
      reporter: formatUser(updated.reporter)!,
    };
  }

  /**
   * Delete an issue
   */
  async deleteIssue(
    user: { id: string; role: UserRole },
    id: string
  ): Promise<void> {
    const existing = await prisma.issue.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Issue not found');
    }

    const membership = await this.checkProjectAccess(existing.projectId, user.id, user.role);

    // Permission: Only project ADMIN, global ADMIN, or reporter can delete
    const isProjectAdmin = membership.role === ProjectMemberRole.ADMIN;
    const isGlobalAdmin = user.role === UserRole.ADMIN;
    const isReporter = existing.reporterId === user.id;

    if (!isProjectAdmin && !isGlobalAdmin && !isReporter) {
      throw new ForbiddenError('You do not have permission to delete this issue');
    }

    await prisma.issue.delete({ where: { id } });
  }
}

export const issueService = new IssueService();
