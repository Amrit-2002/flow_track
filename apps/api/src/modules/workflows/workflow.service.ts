import { prisma } from '../../shared/prisma.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnprocessableEntityError,
} from '../../shared/errors.js';
import { StatusDTO, WorkflowTransitionDTO, CreateTransitionInput, CreateStatusInput } from '@flowtrack/shared';

export class WorkflowService {
  /**
   * Retrieve all workflow statuses ordered by their configured order
   */
  async getStatuses(): Promise<StatusDTO[]> {
    const statuses = await prisma.status.findMany({
      orderBy: { order: 'asc' },
    });

    return statuses.map((s) => ({
      id: s.id,
      name: s.name,
      order: s.order,
    }));
  }

  /**
   * Retrieve single status by ID
   */
  async getStatusById(id: string): Promise<StatusDTO> {
    const status = await prisma.status.findUnique({
      where: { id },
    });

    if (!status) {
      throw new NotFoundError('Status not found');
    }

    return {
      id: status.id,
      name: status.name,
      order: status.order,
    };
  }

  /**
   * Retrieve all configured transitions with from/to relations
   */
  async getTransitions(): Promise<WorkflowTransitionDTO[]> {
    const transitions = await prisma.workflowTransition.findMany({
      include: {
        fromStatus: true,
        toStatus: true,
      },
      orderBy: [
        { fromStatus: { order: 'asc' } },
        { toStatus: { order: 'asc' } },
      ],
    });

    return transitions.map((t) => ({
      id: t.id,
      fromStatusId: t.fromStatusId,
      toStatusId: t.toStatusId,
      fromStatus: {
        id: t.fromStatus.id,
        name: t.fromStatus.name,
        order: t.fromStatus.order,
      },
      toStatus: {
        id: t.toStatus.id,
        name: t.toStatus.name,
        order: t.toStatus.order,
      },
    }));
  }

  /**
   * Check if transition from one status to another is permitted
   */
  async isTransitionAllowed(fromStatusId: string, toStatusId: string): Promise<boolean> {
    if (fromStatusId === toStatusId) {
      return true;
    }

    const transition = await prisma.workflowTransition.findUnique({
      where: {
        fromStatusId_toStatusId: {
          fromStatusId,
          toStatusId,
        },
      },
    });

    return !!transition;
  }

  /**
   * Validate transition and throw 422 if invalid
   */
  async validateTransition(fromStatusId: string, toStatusId: string): Promise<{ fromStatusName: string; toStatusName: string }> {
    const [fromStatus, toStatus] = await Promise.all([
      prisma.status.findUnique({ where: { id: fromStatusId } }),
      prisma.status.findUnique({ where: { id: toStatusId } }),
    ]);

    if (!fromStatus) {
      throw new NotFoundError('Source status not found');
    }
    if (!toStatus) {
      throw new NotFoundError('Target status not found');
    }

    if (fromStatusId === toStatusId) {
      return { fromStatusName: fromStatus.name, toStatusName: toStatus.name };
    }

    const allowed = await this.isTransitionAllowed(fromStatusId, toStatusId);

    if (!allowed) {
      throw new UnprocessableEntityError(
        `Workflow transition from "${fromStatus.name}" to "${toStatus.name}" is not permitted by workflow rules`,
        'INVALID_WORKFLOW_TRANSITION'
      );
    }

    return { fromStatusName: fromStatus.name, toStatusName: toStatus.name };
  }

  /**
   * Create a new status (Admin only)
   */
  async createStatus(data: CreateStatusInput): Promise<StatusDTO> {
    const existing = await prisma.status.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictError(`Status with name "${data.name}" already exists`);
    }

    const status = await prisma.status.create({
      data: {
        name: data.name,
        order: data.order,
      },
    });

    return {
      id: status.id,
      name: status.name,
      order: status.order,
    };
  }

  /**
   * Create an allowed transition (Admin only)
   */
  async createTransition(data: CreateTransitionInput): Promise<WorkflowTransitionDTO> {
    if (data.fromStatusId === data.toStatusId) {
      throw new BadRequestError('Cannot create a transition from a status to itself');
    }

    const [fromStatus, toStatus] = await Promise.all([
      prisma.status.findUnique({ where: { id: data.fromStatusId } }),
      prisma.status.findUnique({ where: { id: data.toStatusId } }),
    ]);

    if (!fromStatus) {
      throw new NotFoundError('Source status not found');
    }
    if (!toStatus) {
      throw new NotFoundError('Target status not found');
    }

    const existing = await prisma.workflowTransition.findUnique({
      where: {
        fromStatusId_toStatusId: {
          fromStatusId: data.fromStatusId,
          toStatusId: data.toStatusId,
        },
      },
    });

    if (existing) {
      throw new ConflictError('This workflow transition is already configured');
    }

    const transition = await prisma.workflowTransition.create({
      data: {
        fromStatusId: data.fromStatusId,
        toStatusId: data.toStatusId,
      },
      include: {
        fromStatus: true,
        toStatus: true,
      },
    });

    return {
      id: transition.id,
      fromStatusId: transition.fromStatusId,
      toStatusId: transition.toStatusId,
      fromStatus: {
        id: transition.fromStatus.id,
        name: transition.fromStatus.name,
        order: transition.fromStatus.order,
      },
      toStatus: {
        id: transition.toStatus.id,
        name: transition.toStatus.name,
        order: transition.toStatus.order,
      },
    };
  }

  /**
   * Delete an existing transition (Admin only)
   */
  async deleteTransition(id: string): Promise<void> {
    const existing = await prisma.workflowTransition.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Workflow transition not found');
    }

    await prisma.workflowTransition.delete({
      where: { id },
    });
  }
}

export const workflowService = new WorkflowService();
