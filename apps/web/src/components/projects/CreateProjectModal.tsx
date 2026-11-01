import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema, CreateProjectInput } from '@flowtrack/shared';
import { X, FolderPlus, Loader2 } from 'lucide-react';
import { projectService } from '../../services/project.service';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      key: '',
      description: '',
    },
  });

  if (!isOpen) return null;

  // Auto-generate project key from name if key hasn't been manually set
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nameVal = e.target.value;
    setValue('name', nameVal);

    const currentKey = watch('key');
    if (!currentKey || currentKey.length <= 5) {
      // Create uppercase key from initials or prefix
      const words = nameVal.trim().split(/\s+/).filter(Boolean);
      let autoKey = '';
      if (words.length >= 2) {
        autoKey = words
          .slice(0, 4)
          .map((w) => w[0])
          .join('')
          .toUpperCase();
      } else if (words.length === 1 && words[0].length >= 3) {
        autoKey = words[0].slice(0, 4).toUpperCase();
      }
      if (autoKey && autoKey.length >= 2 && autoKey.length <= 10) {
        setValue('key', autoKey, { shouldValidate: true });
      }
    }
  };

  const onSubmit = async (data: CreateProjectInput) => {
    try {
      setServerError(null);
      await projectService.createProject(data);
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to create project';
      setServerError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Create New Project
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Set up a new workspace for issues and team collaboration.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {serverError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
              {serverError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Project Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Mobile Banking App"
              {...register('name')}
              onChange={handleNameChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Project Key *
            </label>
            <input
              type="text"
              placeholder="e.g. MBA"
              {...register('key')}
              onChange={(e) =>
                setValue('key', e.target.value.toUpperCase(), {
                  shouldValidate: true,
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm"
            />
            <p className="mt-1 text-xs text-slate-400">
              Unique 2-10 character uppercase code used as prefix for issue identifiers (e.g. MBA-101).
            </p>
            {errors.key && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {errors.key.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Describe the goals, stack, or deliverable targets..."
              {...register('description')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm resize-none"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500 font-medium">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
