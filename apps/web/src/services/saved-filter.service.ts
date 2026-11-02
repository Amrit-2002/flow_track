import api from './api';
import { CreateSavedFilterInput, SavedFilterDTO } from '@flowtrack/shared';

export const savedFilterService = {
  /**
   * Fetch all saved filters for the current user
   */
  async getSavedFilters(): Promise<SavedFilterDTO[]> {
    const response = await api.get<{ success: boolean; data: SavedFilterDTO[] }>(
      '/saved-filters'
    );
    return response.data.data;
  },

  /**
   * Save a new custom filter view
   */
  async createSavedFilter(input: CreateSavedFilterInput): Promise<SavedFilterDTO> {
    const response = await api.post<{ success: boolean; data: SavedFilterDTO }>(
      '/saved-filters',
      input
    );
    return response.data.data;
  },

  /**
   * Delete a saved filter
   */
  async deleteSavedFilter(id: string): Promise<void> {
    await api.delete(`/saved-filters/${id}`);
  },
};

