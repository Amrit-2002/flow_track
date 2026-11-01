import { Request, Response, NextFunction } from 'express';
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
} from '@flowtrack/shared';
import { projectService } from './project.service';

export class ProjectController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

      const result = await projectService.listProjects(
        req.user!.id,
        req.user!.role,
        page,
        limit
      );

      res.status(200).json({
        success: true,
        data: result.projects,
        meta: {
          page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createProjectSchema.parse(req.body);
      const project = await projectService.createProject(
        validated,
        req.user!.id,
        req.user!.role
      );

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project,
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.getProjectById(
        req.params.id,
        req.user!.id,
        req.user!.role
      );

      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateProjectSchema.parse(req.body);
      const project = await projectService.updateProject(
        req.params.id,
        validated,
        req.user!.id,
        req.user!.role
      );

      res.status(200).json({
        success: true,
        message: 'Project updated successfully',
        data: project,
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectService.deleteProject(
        req.params.id,
        req.user!.id,
        req.user!.role
      );

      res.status(200).json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = addProjectMemberSchema.parse(req.body);
      const member = await projectService.addMember(
        req.params.id,
        validated,
        req.user!.id,
        req.user!.role
      );

      res.status(200).json({
        success: true,
        message: 'Member added successfully',
        data: member,
      });
    } catch (err) {
      next(err);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await projectService.removeMember(
        req.params.id,
        req.params.userId,
        req.user!.id,
        req.user!.role
      );

      res.status(200).json({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const projectController = new ProjectController();
