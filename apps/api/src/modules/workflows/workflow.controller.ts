import { Request, Response, NextFunction } from 'express';
import { workflowService } from './workflow.service.js';
import { CreateStatusInput, CreateTransitionInput, ValidateTransitionInput } from '@flowtrack/shared';

export class WorkflowController {
  async getStatuses(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statuses = await workflowService.getStatuses();
      res.status(200).json({
        success: true,
        data: statuses,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatusById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const status = await workflowService.getStatusById(id);
      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  async createStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: CreateStatusInput = req.body;
      const status = await workflowService.createStatus(input);
      res.status(201).json({
        success: true,
        data: status,
        message: 'Status created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getTransitions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transitions = await workflowService.getTransitions();
      res.status(200).json({
        success: true,
        data: transitions,
      });
    } catch (error) {
      next(error);
    }
  }

  async validateTransition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fromStatusId, toStatusId }: ValidateTransitionInput = req.body;
      const result = await workflowService.validateTransition(fromStatusId, toStatusId);
      res.status(200).json({
        success: true,
        data: {
          allowed: true,
          ...result,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async createTransition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: CreateTransitionInput = req.body;
      const transition = await workflowService.createTransition(input);
      res.status(201).json({
        success: true,
        data: transition,
        message: 'Workflow transition created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTransition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await workflowService.deleteTransition(id);
      res.status(200).json({
        success: true,
        message: 'Workflow transition deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const workflowController = new WorkflowController();
