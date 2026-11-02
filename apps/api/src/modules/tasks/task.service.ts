import { prisma } from '../../shared/prisma';
import {
  CreateTaskInput,
  UpdateTaskInput,
  TaskDTO,
  UserRole,
  PaginatedResponse,
} from '@flowtrack/shared';
import { ForbiddenError, NotFoundError, BadRequestError } from '../../shared/errors';
import { Prisma } from '@prisma/client';

export interface ListTasksFilter {
  page?: number;
  limit?: number;
  client?: string;
  devStatus?: string;
  priority?: string;
  search?: string;
}

export class TaskService {
  async listTasks(
    user: { id: string; role: UserRole },
    filter: ListTasksFilter = {}
  ): Promise<PaginatedResponse<TaskDTO>> {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
    };

    if (user.role !== UserRole.ADMIN) {
      where.userId = user.id;
    }

    if (filter.client) {
      where.client = filter.client;
    }

    if (filter.devStatus) {
      where.devStatus = filter.devStatus;
    }

    if (filter.priority) {
      where.priority = filter.priority;
    }

    if (filter.search && filter.search.trim()) {
      const keyword = filter.search.trim();
      where.OR = [
        { taskBugName: { contains: keyword, mode: 'insensitive' } },
        { owner: { contains: keyword, mode: 'insensitive' } },
        { comment: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.count({ where }),
    ]);

    const formattedTasks: TaskDTO[] = tasks.map((t) => ({
      id: t.id,
      userId: t.userId,
      client: t.client,
      taskBugName: t.taskBugName,
      owner: t.owner,
      priority: t.priority,
      startDate: t.startDate.toISOString().split('T')[0],
      endDate: t.endDate.toISOString().split('T')[0],
      devStatus: t.devStatus,
      unitTestStatus: t.unitTestStatus,
      stagingStatus: t.stagingStatus,
      prodStatus: t.prodStatus,
      comment: t.comment,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: formattedTasks,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getTaskById(
    user: { id: string; role: UserRole },
    id: string
  ): Promise<TaskDTO> {
    const task = await prisma.task.findFirst({
      where: { id, deletedAt: null },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    if (user.role !== UserRole.ADMIN && task.userId !== user.id) {
      throw new ForbiddenError('You do not have access to this task');
    }

    return {
      id: task.id,
      userId: task.userId,
      client: task.client,
      taskBugName: task.taskBugName,
      owner: task.owner,
      priority: task.priority,
      startDate: task.startDate.toISOString().split('T')[0],
      endDate: task.endDate.toISOString().split('T')[0],
      devStatus: task.devStatus,
      unitTestStatus: task.unitTestStatus,
      stagingStatus: task.stagingStatus,
      prodStatus: task.prodStatus,
      comment: task.comment,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  async createTask(
    user: { id: string },
    data: CreateTaskInput
  ): Promise<TaskDTO> {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate < startDate) {
      throw new BadRequestError('End date must be on or after start date');
    }

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        client: data.client,
        taskBugName: data.taskBugName,
        owner: data.owner,
        priority: data.priority,
        startDate,
        endDate,
        devStatus: data.devStatus,
        unitTestStatus: data.unitTestStatus,
        stagingStatus: data.stagingStatus,
        prodStatus: data.prodStatus,
        comment: data.comment || null,
      },
    });

    return {
      id: task.id,
      userId: task.userId,
      client: task.client,
      taskBugName: task.taskBugName,
      owner: task.owner,
      priority: task.priority,
      startDate: task.startDate.toISOString().split('T')[0],
      endDate: task.endDate.toISOString().split('T')[0],
      devStatus: task.devStatus,
      unitTestStatus: task.unitTestStatus,
      stagingStatus: task.stagingStatus,
      prodStatus: task.prodStatus,
      comment: task.comment,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  async updateTask(
    user: { id: string; role: UserRole },
    id: string,
    data: UpdateTaskInput
  ): Promise<TaskDTO> {
    const existing = await this.getTaskById(user, id);

    let startDate = existing.startDate ? new Date(existing.startDate) : undefined;
    let endDate = existing.endDate ? new Date(existing.endDate) : undefined;

    if (data.startDate) {
      startDate = new Date(data.startDate);
    }
    if (data.endDate) {
      endDate = new Date(data.endDate);
    }

    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestError('End date must be on or after start date');
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        client: data.client,
        taskBugName: data.taskBugName,
        owner: data.owner,
        priority: data.priority,
        startDate,
        endDate,
        devStatus: data.devStatus,
        unitTestStatus: data.unitTestStatus,
        stagingStatus: data.stagingStatus,
        prodStatus: data.prodStatus,
        comment: data.comment,
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      client: updated.client,
      taskBugName: updated.taskBugName,
      owner: updated.owner,
      priority: updated.priority,
      startDate: updated.startDate.toISOString().split('T')[0],
      endDate: updated.endDate.toISOString().split('T')[0],
      devStatus: updated.devStatus,
      unitTestStatus: updated.unitTestStatus,
      stagingStatus: updated.stagingStatus,
      prodStatus: updated.prodStatus,
      comment: updated.comment,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteTask(
    user: { id: string; role: UserRole },
    id: string
  ): Promise<void> {
    await this.getTaskById(user, id);

    await prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const taskService = new TaskService();

