import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  Calendar,
  Settings,
  Trash2,
  UserPlus,
  Shield,
  User as UserIcon,
  Loader2,
  AlertCircle,
  FolderKanban,
  ExternalLink,
} from 'lucide-react';
import { projectService } from '../services/project.service';
import { AddMemberModal } from '../components/projects/AddMemberModal';
import { EditProjectModal } from '../components/projects/EditProjectModal';
import { useAppSelector } from '../hooks/useRedux';
import { ProjectMemberRole, UserRole } from '@flowtrack/shared';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState<'members' | 'issues'>('members');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: project,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getProjectById(id!),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Loading project details...</p>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="p-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl text-center space-y-3 max-w-lg mx-auto mt-12">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <h3 className="text-sm font-bold text-red-700 dark:text-red-400">
          Failed to load project
        </h3>
        <p className="text-xs text-red-600 dark:text-red-400">
          {(error as any)?.message || 'Project not found or you do not have permission to view it.'}
        </p>
        <Link
          to="/projects"
          className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </Link>
      </div>
    );
  }

  // Check if current user is project ADMIN or global ADMIN
  const currentMember = project.members?.find((m) => m.userId === user?.id);
  const isProjectAdmin =
    user?.role === UserRole.ADMIN || currentMember?.role === ProjectMemberRole.ADMIN;

  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this project?`)) {
      return;
    }
    try {
      setActionError(null);
      await projectService.removeMember(project.id, memberUserId);
      refetch();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to remove member';
      setActionError(msg);
    }
  };

  const handleDeleteProject = async () => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${project.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      setActionError(null);
      await projectService.deleteProject(project.id);
      navigate('/projects');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to delete project';
      setActionError(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
        <Link
          to="/projects"
          className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center space-x-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Projects</span>
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-900 dark:text-white font-mono">
          {project.key}
        </span>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Project Header Banner */}
      <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center space-x-2.5">
              <span className="px-3 py-1 text-xs font-bold rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900 font-mono tracking-wider">
                {project.key}
              </span>
              {project.isArchived && (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Archived
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {project.name}
            </h1>

            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {project.description || 'No description provided for this project.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                <span>
                  {project.members?.length ?? 0} {project.members?.length === 1 ? 'member' : 'members'}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
                <span>
                  {project.issues?.length ?? 0} {project.issues?.length === 1 ? 'issue' : 'issues'}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons for Project Admin */}
          {isProjectAdmin && (
            <div className="flex items-center space-x-2.5 self-start">
              <button
                onClick={() => setIsEditProjectOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Settings</span>
              </button>
              <button
                onClick={handleDeleteProject}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Team Members ({project.members?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'issues'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Issues Backlog ({project.issues?.length ?? 0})
          </button>
        </nav>
      </div>

      {/* Tab 1: Team Members */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Project Team
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                People with access to manage or contribute to issues in this project.
              </p>
            </div>
            {isProjectAdmin && (
              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {project.members && project.members.length > 0 ? (
                project.members.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-sm">
                        {member.user?.name ? member.user.name[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {member.user?.name || 'Unknown User'}
                          </h4>
                          {member.role === ProjectMemberRole.ADMIN ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900 uppercase">
                              <Shield className="w-3 h-3" />
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                              Member
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {member.user?.email || member.userId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <span className="text-xs text-slate-400 hidden sm:inline">
                        Joined {new Date(member.createdAt).toLocaleDateString()}
                      </span>
                      {isProjectAdmin && member.userId !== user?.id && (
                        <button
                          onClick={() =>
                            handleRemoveMember(member.userId, member.user?.name || 'this member')
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Remove from project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-slate-400">
                  No members assigned yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Issues Backlog */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Project Issues
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track stories, tasks, and bugs logged under {project.key}.
              </p>
            </div>
            <Link
              to="/kanban"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
              <span>View Kanban Board</span>
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {project.issues && project.issues.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {project.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {project.key}-{issue.id.slice(0, 4)}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {issue.title}
                        </h4>
                        <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                          <span>Type: {issue.type}</span>
                          <span>•</span>
                          <span>Priority: {issue.priority}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-900">
                        {issue.status?.name || 'Open'}
                      </span>
                      <Link
                        to={`/issues?projectId=${project.id}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  No issues created for {project.key} yet
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Start tracking stories, features, and bug fixes by creating issues under this project.
                </p>
                <Link
                  to="/issues"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-all shadow-sm"
                >
                  <span>Go to Issues Backlog</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      <AddMemberModal
        projectId={project.id}
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        project={project}
        isOpen={isEditProjectOpen}
        onClose={() => setIsEditProjectOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

export default ProjectDetailPage;
