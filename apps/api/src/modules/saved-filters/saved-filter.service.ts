import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/prisma.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors.js';
import { CreateSavedFilterInput, SavedFilterDTO, UserRole } from '@flowtrack/shared';

export class SavedFilterService {
  /**
   * List all saved filters for the authenticated user
   */
  async listSavedFilters(userId: string): Promise<SavedFilterDTO[]> {
    const filters = await prisma.savedFilter.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return filters.map((f) => ({
      id: f.id,
      userId: f.userId,
      name: f.name,
      filterData: f.filterData as Record<string, unknown>,
      createdAt: f.createdAt.toISOString(),
    }));
  }

  /**
   * Save a new custom filter view
   */
  async createSavedFilter(
    userId: string,
    input: CreateSavedFilterInput
  ): Promise<SavedFilterDTO> {
    const filter = await prisma.savedFilter.create({
      data: {
        userId,
        name: input.name.trim(),
        filterData: input.filterData as Prisma.InputJsonValue,
      },
    });

    return {
      id: filter.id,
      userId: filter.userId,
      name: filter.name,
      filterData: filter.filterData as Record<string, unknown>,
      createdAt: filter.createdAt.toISOString(),
    };
  }

  /**
   * Delete a saved filter
   */
  async deleteSavedFilter(
    user: { id: string; role: UserRole },
    id: string
  ): Promise<void> {
    const existing = await prisma.savedFilter.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Saved filter not found');
    }

    if (existing.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenError('You do not have permission to delete this filter');
    }

    await prisma.savedFilter.delete({
      where: { id },
    });
  }
}

export const savedFilterService = new SavedFilterService();

