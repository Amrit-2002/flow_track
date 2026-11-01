import {
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectMemberInput,
  ProjectDTO,
  ProjectMemberDTO,
  ProjectMemberRole,
  UserRole,
} from '@flowtrack/shared';
import { prisma } from '../../shared/prisma';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '../../shared/errors';

export class ProjectService {
  /**
   * Helper to verify if user is a member of the project or a global admin
   */
  async checkMembership(
    projectId: string,
    userId: string,
    userRole: UserRole
  ): Promise<ProjectMemberRole | 'GLOBAL_ADMIN'> {
    if (userRole === UserRole.ADMIN) {
      return 'GLOBAL_ADMIN';
    }

    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenError('You are not a member of this project.');
    }

    return member.role as ProjectMemberRole;
  }

  /**
   * Helper to verify if user is a project admin or a global admin
   */
  async checkProjectAdmin(projectId: string, userId: string, userRole: UserRole): Promise<void> {
    if (userRole === UserRole.ADMIN) {
      return;
    }

    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    if (!member || member.role !== ProjectMemberRole.ADMIN) {
      throw new ForbiddenError('Only project administrators can manage this project.');
    }
  }

  async listProjects(
    userId: string,
    userRole: UserRole,
    page = 1,
    limit = 10
  ): Promise<{ projects: ProjectDTO[]; total: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    // Platform ADMIN sees all projects, others see projects they are members of
    const whereClause =
      userRole === UserRole.ADMIN
        ? { isArchived: false }
        : {
            isArchived: false,
            members: {
              some: { userId },
            },
          };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              issues: true,
              members: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.project.count({ where: whereClause }),
    ]);

    const formatted: ProjectDTO[] = projects.map((p) => ({
      id: p.id,
      name: p.name,
      key: p.key,
      description: p.description,
      isArchived: p.isArchived,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      _count: p._count,
    }));

    return {
      projects: formatted,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async createProject(
    input: CreateProjectInput,
    userId: string,
    userRole: UserRole
  ): Promise<ProjectDTO> {
    // Exact parity with Laravel ProjectPolicy::create ($user->isAdminOrManager())
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.MANAGER) {
      throw new ForbiddenError('Only platform Administrators and Managers can create projects.');
    }

    const keyUpper = input.key.trim().toUpperCase();

    // Check unique key
    const existing = await prisma.project.findUnique({
      where: { key: keyUpper },
    });

    if (existing) {
      throw new ConflictError(`A project with key '${keyUpper}' already exists.`);
    }

    // Transaction: create project and attach creator as project admin
    const project = await prisma.$transaction(async (tx) => {
      const p = await tx.project.create({
        data: {
          name: input.name.trim(),
          key: keyUpper,
          description: input.description?.trim() || null,
        },
      });

      await tx.projectMember.create({
        data: {
          projectId: p.id,
          userId,
          role: ProjectMemberRole.ADMIN,
        },
      });

      return p;
    });

    return {
      id: project.id,
      name: project.name,
      key: project.key,
      description: project.description,
      isArchived: project.isArchived,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      _count: { issues: 0, members: 1 },
    };
  }

  async getProjectById(
    projectId: string,
    userId: string,
    userRole: UserRole
  ): Promise<ProjectDTO & { members: ProjectMemberDTO[] }> {
    await this.checkMembership(projectId, userId, userRole);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
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
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { issues: true, members: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    return {
      id: project.id,
      name: project.name,
      key: project.key,
      description: project.description,
      isArchived: project.isArchived,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      _count: project._count,
      members: project.members.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        userId: m.userId,
        role: m.role as ProjectMemberRole,
        createdAt: m.createdAt.toISOString(),
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.user.role as UserRole,
          themePreference: m.user.themePreference as any,
          createdAt: m.user.createdAt.toISOString(),
        },
      })),
    };
  }

  async updateProject(
    projectId: string,
    input: UpdateProjectInput,
    userId: string,
    userRole: UserRole
  ): Promise<ProjectDTO> {
    await this.checkProjectAdmin(projectId, userId, userRole);

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(input.name && { name: input.name.trim() }),
        ...(input.description !== undefined && { description: input.description?.trim() || null }),
        ...(input.isArchived !== undefined && { isArchived: input.isArchived }),
      },
      include: {
        _count: { select: { issues: true, members: true } },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      key: updated.key,
      description: updated.description,
      isArchived: updated.isArchived,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      _count: updated._count,
    };
  }

  async deleteProject(projectId: string, userId: string, userRole: UserRole): Promise<void> {
    await this.checkProjectAdmin(projectId, userId, userRole);

    await prisma.project.delete({
      where: { id: projectId },
    });
  }

  async addMember(
    projectId: string,
    input: AddProjectMemberInput,
    userId: string,
    userRole: UserRole
  ): Promise<ProjectMemberDTO> {
    await this.checkProjectAdmin(projectId, userId, userRole);

    // Verify user exists and is active
    const targetUser = await prisma.user.findFirst({
      where: { id: input.userId, deletedAt: null },
    });

    if (!targetUser) {
      throw new NotFoundError('Target user not found.');
    }

    // Upsert member
    const member = await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: input.userId,
        },
      },
      update: {
        role: input.role,
      },
      create: {
        projectId,
        userId: input.userId,
        role: input.role,
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

    return {
      id: member.id,
      projectId: member.projectId,
      userId: member.userId,
      role: member.role as ProjectMemberRole,
      createdAt: member.createdAt.toISOString(),
      user: {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: member.user.role as UserRole,
        themePreference: member.user.themePreference as any,
        createdAt: member.user.createdAt.toISOString(),
      },
    };
  }

  async removeMember(
    projectId: string,
    targetUserId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    await this.checkProjectAdmin(projectId, userId, userRole);

    // Prevent removing the last project admin
    const adminCount = await prisma.projectMember.count({
      where: { projectId, role: ProjectMemberRole.ADMIN },
    });

    const targetMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
    });

    if (!targetMember) {
      throw new NotFoundError('Member not found in this project.');
    }

    if (targetMember.role === ProjectMemberRole.ADMIN && adminCount <= 1) {
      throw new BadRequestError('Cannot remove the only project administrator.');
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });
  }
}

export const projectService = new ProjectService();
