import { Request, Response, NextFunction } from 'express';
import { attachmentService } from './attachment.service.js';
import { BadRequestError } from '../../shared/errors.js';

export class AttachmentController {
  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { issueId } = req.params;
      const file = req.file;

      if (!file) {
        throw new BadRequestError('File must be provided');
      }

      const attachment = await attachmentService.uploadIssueAttachment(
        { id: user.id, role: user.role },
        issueId,
        file
      );

      res.status(201).json({
        success: true,
        data: attachment,
        message: 'Attachment uploaded successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;

      await attachmentService.deleteAttachment(
        { id: user.id, role: user.role },
        id
      );

      res.status(200).json({
        success: true,
        message: 'Attachment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { filePath, fileName, mimeType } = await attachmentService.getAttachmentDownload(id);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  }
}

export const attachmentController = new AttachmentController();
