import { Request, Response, NextFunction } from 'express';
import { issueService } from './issue.service';
import {
  createIssueSchema,
  updateIssueSchema,
  IssuePriority,
  IssueType,
} from '@flowtrack/shared';

export class IssueController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const {
        page,
        limit,
        projectId,
        statusId,
        priority,
        type,
        assigneeId,
        parentId,
        search,
        sortBy,
        sortOrder,
      } = req.query;

      const result = await issueService.listIssues(
        { id: user.id, role: user.role },
        {
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
          projectId: typeof projectId === 'string' ? projectId : undefined,
          statusId: typeof statusId === 'string' ? statusId : undefined,
          priority: typeof priority === 'string' ? (priority as IssuePriority) : undefined,
          type: typeof type === 'string' ? (type as IssueType) : undefined,
          assigneeId: typeof assigneeId === 'string' ? assigneeId : undefined,
          parentId: typeof parentId === 'string' ? parentId : undefined,
          search: typeof search === 'string' ? search : undefined,
          sortBy: typeof sortBy === 'string' ? (sortBy as any) : undefined,
          sortOrder: typeof sortOrder === 'string' ? (sortOrder as any) : undefined,
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
      const issue = await issueService.getIssueById(
        { id: user.id, role: user.role },
        req.params.id
      );

      res.status(200).json({
        success: true,
        data: issue,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const validated = createIssueSchema.parse(req.body);

      const issue = await issueService.createIssue(
        { id: user.id, role: user.role },
        validated
      );

      res.status(201).json({
        success: true,
        data: issue,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const validated = updateIssueSchema.parse(req.body);

      const issue = await issueService.updateIssue(
        { id: user.id, role: user.role },
        req.params.id,
        validated
      );

      res.status(200).json({
        success: true,
        data: issue,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      await issueService.deleteIssue(
        { id: user.id, role: user.role },
        req.params.id
      );

      res.status(200).json({
        success: true,
        message: 'Issue deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const issueController = new IssueController();
