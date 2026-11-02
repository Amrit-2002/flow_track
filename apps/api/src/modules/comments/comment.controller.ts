import { Request, Response, NextFunction } from 'express';
import { commentService } from './comment.service.js';
import { createCommentSchema, updateCommentSchema } from '@flowtrack/shared';

export class CommentController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { issueId } = req.params;
      const comments = await commentService.listComments(
        { id: user.id, role: user.role },
        issueId
      );

      res.status(200).json({
        success: true,
        data: comments,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { issueId } = req.params;
      const validated = createCommentSchema.parse(req.body);
      const files = req.files as Express.Multer.File[] | undefined;

      const comment = await commentService.createComment(
        { id: user.id, role: user.role },
        issueId,
        validated,
        files
      );

      res.status(201).json({
        success: true,
        data: comment,
        message: 'Comment added successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const validated = updateCommentSchema.parse(req.body);

      const comment = await commentService.updateComment(
        { id: user.id, role: user.role },
        id,
        validated
      );

      res.status(200).json({
        success: true,
        data: comment,
        message: 'Comment updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      await commentService.deleteComment(
        { id: user.id, role: user.role },
        id
      );

      res.status(200).json({
        success: true,
        message: 'Comment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const commentController = new CommentController();
