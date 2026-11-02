import { prisma } from '../../shared/prisma.js';
import { storageService } from '../attachments/storage.service.js';
import { emitToProject, emitToUser } from '../../sockets/index.js';
import {
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors.js';
import {
  CommentDTO,
  CreateCommentInput,
  ProjectMemberRole,
  UpdateCommentInput,
  UserRole,
} from '@flowtrack/shared';

export class CommentService {
  /**
   * Helper to verify project membership access
   */
  private async checkProjectAccess(
    projectId: string,
    userId: string,
    userRole: UserRole
  ) {
    if (userRole === UserRole.ADMIN || userRole === UserRole.MANAGER) {
      return { role: ProjectMemberRole.ADMIN };
    }

    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenError('You do not have access to this project');
    }

    return member;
  }

  /**
   * List all comments for an issue in chronological order
   */
  async listComments(
    user: { id: string; role: UserRole },
    issueId: string
  ): Promise<CommentDTO[]> {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundError('Issue not found');
    }

    await this.checkProjectAccess(issue.projectId, user.id, user.role);

    const comments = await prisma.comment.findMany({
      where: { issueId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            themePreference: true,
            createdAt: true,
          },
        },
        attachments: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((c) => ({
      id: c.id,
      issueId: c.issueId,
      userId: c.userId,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      user: {
        id: c.user.id,
        name: c.user.name,
        email: c.user.email,
        role: c.user.role as any,
        themePreference: c.user.themePreference as any,
        createdAt: c.user.createdAt.toISOString(),
      },
      attachments: c.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileKey: a.fileKey,
        fileUrl: a.fileUrl,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        userId: a.userId,
        createdAt: a.createdAt.toISOString(),
      })),
    }));
  }

  /**
   * Create a comment with optional file attachments and notifications
   */
  async createComment(
    user: { id: string; role: UserRole },
    issueId: string,
    data: CreateCommentInput,
    files?: Express.Multer.File[]
  ): Promise<CommentDTO> {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        project: true,
      },
    });

    if (!issue) {
      throw new NotFoundError('Issue not found');
    }

    await this.checkProjectAccess(issue.projectId, user.id, user.role);

    // Save uploaded files to storage
    const savedFiles: {
      fileName: string;
      fileKey: string;
      fileUrl: string;
      mimeType: string;
      fileSize: number;
    }[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const saved = await storageService.saveFile(file);
        savedFiles.push(saved);
      }
    }

    // Execute in transaction
    const newComment = await prisma.$transaction(async (tx) => {
      // 1. Create comment
      const comment = await tx.comment.create({
        data: {
          issueId,
          userId: user.id,
          content: data.content,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              themePreference: true,
              createdAt: true,
            },
          },
        },
      });

      // 2. Attach files if uploaded
      const createdAttachments = [];
      for (const saved of savedFiles) {
        const att = await tx.attachment.create({
          data: {
            issueId,
            commentId: comment.id,
            userId: user.id,
            fileName: saved.fileName,
            fileKey: saved.fileKey,
            fileUrl: saved.fileUrl,
            mimeType: saved.mimeType,
            fileSize: saved.fileSize,
          },
        });
        createdAttachments.push(att);
      }

      // 3. Record Activity audit
      await tx.activity.create({
        data: {
          issueId,
          userId: user.id,
          action: 'COMMENT_ADDED',
          newValue: data.content.length > 100 ? `${data.content.slice(0, 97)}...` : data.content,
        },
      });

      // 4. Create in-app Notifications for assignee and reporter
      const notificationRecipients = new Set<string>();
      if (issue.assigneeId && issue.assigneeId !== user.id) {
        notificationRecipients.add(issue.assigneeId);
      }
      if (issue.reporterId && issue.reporterId !== user.id) {
        notificationRecipients.add(issue.reporterId);
      }

      const createdNotifications: any[] = [];
      for (const recipientId of notificationRecipients) {
        const notif = await tx.notification.create({
          data: {
            userId: recipientId,
            type: 'ISSUE_COMMENTED',
            title: `New comment on ${issue.title}`,
            message: `${comment.user.name} commented on issue "${issue.title}"`,
            data: {
              issueId: issue.id,
              projectId: issue.projectId,
              commentId: comment.id,
            },
          },
        });
        createdNotifications.push(notif);
      }

      return {
        ...comment,
        attachments: createdAttachments,
        createdNotifications,
      };
    });

    // Real-time dispatch to notification recipients
    for (const notif of newComment.createdNotifications || []) {
      emitToUser(notif.userId, 'notification:new', {
        id: notif.id,
        userId: notif.userId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        data: notif.data,
        readAt: notif.readAt ? (typeof notif.readAt === 'string' ? notif.readAt : notif.readAt.toISOString()) : null,
        createdAt: notif.createdAt ? (typeof notif.createdAt === 'string' ? notif.createdAt : notif.createdAt.toISOString()) : new Date().toISOString(),
      });
    }

    const result: CommentDTO = {
      id: newComment.id,
      issueId: newComment.issueId,
      userId: newComment.userId,
      content: newComment.content,
      createdAt: newComment.createdAt.toISOString(),
      user: {
        id: newComment.user.id,
        name: newComment.user.name,
        email: newComment.user.email,
        role: newComment.user.role as any,
        themePreference: newComment.user.themePreference as any,
        createdAt: newComment.user.createdAt.toISOString(),
      },
      attachments: newComment.attachments.map((a: any) => ({
        id: a.id,
        fileName: a.fileName,
        fileKey: a.fileKey,
        fileUrl: a.fileUrl,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        userId: a.userId,
        createdAt: a.createdAt.toISOString(),
      })),
    };

    emitToProject(issue.projectId, 'issue:comment_added', {
      issueId: issue.id,
      comment: result,
    });

    return result;
  }

  /**
   * Update an existing comment
   */
  async updateComment(
    user: { id: string; role: UserRole },
    commentId: string,
    data: UpdateCommentInput
  ): Promise<CommentDTO> {
    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: true,
        attachments: true,
      },
    });

    if (!existing) {
      throw new NotFoundError('Comment not found');
    }

    if (existing.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenError('You can only edit your own comments');
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: data.content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            themePreference: true,
            createdAt: true,
          },
        },
        attachments: true,
      },
    });

    return {
      id: updated.id,
      issueId: updated.issueId,
      userId: updated.userId,
      content: updated.content,
      createdAt: updated.createdAt.toISOString(),
      user: {
        id: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        role: updated.user.role as any,
        themePreference: updated.user.themePreference as any,
        createdAt: updated.user.createdAt.toISOString(),
      },
      attachments: updated.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileKey: a.fileKey,
        fileUrl: a.fileUrl,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        userId: a.userId,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Delete a comment and its associated attachments
   */
  async deleteComment(
    user: { id: string; role: UserRole },
    commentId: string
  ): Promise<void> {
    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        issue: true,
        attachments: true,
      },
    });

    if (!existing) {
      throw new NotFoundError('Comment not found');
    }

    const isAuthor = existing.userId === user.id;
    const isGlobalAdmin = user.role === UserRole.ADMIN;
    let isProjectAdmin = false;

    if (!isAuthor && !isGlobalAdmin && existing.issue) {
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: existing.issue.projectId,
            userId: user.id,
          },
        },
      });
      isProjectAdmin = member?.role === ProjectMemberRole.ADMIN;
    }

    if (!isAuthor && !isGlobalAdmin && !isProjectAdmin) {
      throw new ForbiddenError('You do not have permission to delete this comment');
    }

    // Clean up physical files
    for (const att of existing.attachments) {
      await storageService.deleteFile(att.fileKey);
    }

    // Delete comment record (cascading deletes attachments from DB)
    await prisma.comment.delete({
      where: { id: commentId },
    });
  }
}

export const commentService = new CommentService();
