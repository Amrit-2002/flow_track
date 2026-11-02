import { Request, Response, NextFunction } from 'express';
import { taskService } from './task.service';
import { createTaskSchema, updateTaskSchema } from '@flowtrack/shared';

export class TaskController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { page, limit, client, devStatus, priority, search } = req.query;

      const result = await taskService.listTasks(
        { id: user.id, role: user.role },
        {
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
          client: typeof client === 'string' ? client : undefined,
          devStatus: typeof devStatus === 'string' ? devStatus : undefined,
          priority: typeof priority === 'string' ? priority : undefined,
          search: typeof search === 'string' ? search : undefined,
        }
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const task = await taskService.getTaskById(
        { id: user.id, role: user.role },
        req.params.id
      );

      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const validated = createTaskSchema.parse(req.body);
      const task = await taskService.createTask({ id: user.id }, validated);

      res.status(201).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const validated = updateTaskSchema.parse(req.body);
      const task = await taskService.updateTask(
        { id: user.id, role: user.role },
        req.params.id,
        validated
      );

      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      await taskService.deleteTask(
        { id: user.id, role: user.role },
        req.params.id
      );

      res.status(200).json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const taskController = new TaskController();

