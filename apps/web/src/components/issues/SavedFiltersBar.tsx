import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Plus, X, Check, Loader2 } from 'lucide-react';
import { savedFilterService } from '../../services/saved-filter.service';
import { CreateSavedFilterInput, SavedFilterDTO } from '@flowtrack/shared';

interface FilterState {
  search?: string;
  projectId?: string;
  statusId?: string;
  priority?: string;
  type?: string;
}

interface SavedFiltersBarProps {
  currentFilters: FilterState;
  onApplyFilter: (filters: FilterState) => void;
  activeFilterId?: string | null;
  onSelectFilterId?: (id: string | null) => void;
}

export const SavedFiltersBar: React.FC<SavedFiltersBarProps> = ({
  currentFilters,
  onApplyFilter,
  activeFilterId,
  onSelectFilterId,
}) => {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: savedFilters = [], isLoading } = useQuery<SavedFilterDTO[]>({
    queryKey: ['saved-filters'],
    queryFn: () => savedFilterService.getSavedFilters(),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateSavedFilterInput) => savedFilterService.createSavedFilter(input),
    onSuccess: (newFilter) => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
      setIsSaving(false);
      setFilterName('');
      setErrorMsg(null);
      if (onSelectFilterId) onSelectFilterId(newFilter.id);
    },
    onError: (err: any) => {
      setErrorMsg(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to save filter'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => savedFilterService.deleteSavedFilter(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
      if (activeFilterId === deletedId && onSelectFilterId) {
        onSelectFilterId(null);
      }
    },
  });

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterName.trim()) {
      setErrorMsg('Please enter a name for this filter.');
      return;
    }

    createMutation.mutate({
      name: filterName.trim(),
      filterData: currentFilters as Record<string, unknown>,
    });
  };

  const handleSelectFilter = (filter: SavedFilterDTO) => {
    if (onSelectFilterId) onSelectFilterId(filter.id);
    onApplyFilter(filter.filterData as FilterState);
  };

  const handleDeleteFilter = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Delete saved filter "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="flex items-center flex-wrap gap-2 text-xs">
      <div className="flex items-center space-x-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[11px] mr-1">
        <Bookmark className="w-3.5 h-3.5 text-brand-500" />
        <span>Views:</span>
      </div>

      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
      ) : (
        savedFilters.map((f) => {
          const isActive = activeFilterId === f.id;
          return (
            <div
              key={f.id}
              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-300 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-semibold'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
              onClick={() => handleSelectFilter(f)}
            >
              <span>{f.name}</span>
              <button
                type="button"
                onClick={(e) => handleDeleteFilter(e, f.id, f.name)}
                disabled={deleteMutation.isPending}
                className="text-slate-400 hover:text-rose-500 transition-colors p-0.5 rounded cursor-pointer"
                title="Delete filter view"
                aria-label={`Delete ${f.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })
      )}

      {/* Save current view button or inline form */}
      {isSaving ? (
        <form onSubmit={handleSaveSubmit} className="inline-flex items-center space-x-1.5">
          <input
            type="text"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="View name..."
            autoFocus
            aria-label="Filter view name"
            className="px-2.5 py-1 text-xs rounded-lg border border-brand-400 dark:border-brand-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="p-1 rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 cursor-pointer"
            title="Save filter"
            aria-label="Confirm save"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSaving(false);
              setErrorMsg(null);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="Cancel"
            aria-label="Cancel save"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsSaving(true)}
          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-brand-600 hover:border-brand-400 transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>Save View</span>
        </button>
      )}

      {errorMsg && (
        <span className="text-[11px] text-rose-500 font-medium ml-1">
          {errorMsg}
        </span>
      )}
    </div>
  );
};

