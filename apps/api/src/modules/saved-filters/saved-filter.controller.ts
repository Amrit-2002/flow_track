import { Request, Response, NextFunction } from 'express';
import { savedFilterService } from './saved-filter.service.js';
import { createSavedFilterSchema } from '@flowtrack/shared';

export class SavedFilterController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const data = await savedFilterService.listSavedFilters(user.id);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const validated = createSavedFilterSchema.parse(req.body);

      const filter = await savedFilterService.createSavedFilter(user.id, validated);

      res.status(201).json({
        success: true,
        data: filter,
        message: 'Filter saved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      await savedFilterService.deleteSavedFilter(
        { id: user.id, role: user.role },
        id
      );

      res.status(200).json({
        success: true,
        message: 'Saved filter deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const savedFilterController = new SavedFilterController();
