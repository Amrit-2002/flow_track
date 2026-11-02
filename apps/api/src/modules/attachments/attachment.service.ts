import { prisma } from '../../shared/prisma.js';
import { storageService } from './storage.service.js';
import {
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors.js';
import {
  AttachmentDTO,
  ProjectMemberRole,
  UserRole,
} from '@flowtrack/shared';
import fs from 'fs';

export class AttachmentService {
  /**
   * Upload an attachment directly to an issue
   */
  async uploadIssueAttachment(
    user: { id: string; role: UserRole },
    issueId: string,
    file: Express.Multer.File
  ): Promise<AttachmentDTO> {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundError('Issue not found');
    }

    // Check project membership access
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER) {
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: issue.projectId,
            userId: user.id,
          },
        },
      });
      if (!member) {
        throw new ForbiddenError('You do not have permission to upload attachments to this issue');
      }
    }

    // Save physical file
    const saved = await storageService.saveFile(file);

    // Save record & audit activity in transaction
    const [attachment] = await prisma.$transaction([
      prisma.attachment.create({
        data: {
          issueId,
          userId: user.id,
          fileName: saved.fileName,
          fileKey: saved.fileKey,
          fileUrl: saved.fileUrl,
          mimeType: saved.mimeType,
          fileSize: saved.fileSize,
        },
      }),
      prisma.activity.create({
        data: {
          issueId,
          userId: user.id,
          action: 'ATTACHMENT_ADDED',
          newValue: saved.fileName,
        },
      }),
    ]);

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileKey: attachment.fileKey,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      userId: attachment.userId,
      createdAt: attachment.createdAt.toISOString(),
    };
  }

  /**
   * Delete an attachment
   */
  async deleteAttachment(
    user: { id: string; role: UserRole },
    attachmentId: string
  ): Promise<void> {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        issue: true,
      },
    });

    if (!attachment) {
      throw new NotFoundError('Attachment not found');
    }

    // Permission: Uploader, Global Admin, or Project Admin can delete
    const isUploader = attachment.userId === user.id;
    const isGlobalAdmin = user.role === UserRole.ADMIN;
    let isProjectAdmin = false;

    if (!isUploader && !isGlobalAdmin && attachment.issue) {
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: attachment.issue.projectId,
            userId: user.id,
          },
        },
      });
      isProjectAdmin = member?.role === ProjectMemberRole.ADMIN;
    }

    if (!isUploader && !isGlobalAdmin && !isProjectAdmin) {
      throw new ForbiddenError('You do not have permission to delete this attachment');
    }

    // Delete physical file
    await storageService.deleteFile(attachment.fileKey);

    // Delete DB record
    await prisma.attachment.delete({
      where: { id: attachmentId },
    });
  }

  /**
   * Retrieve download path and metadata for attachment streaming
   */
  async getAttachmentDownload(attachmentId: string): Promise<{
    filePath: string;
    fileName: string;
    mimeType: string;
  }> {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundError('Attachment not found');
    }

    const filePath = storageService.getFilePath(attachment.fileKey);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Attachment physical file not found on disk');
    }

    return {
      filePath,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    };
  }
}

export const attachmentService = new AttachmentService();
