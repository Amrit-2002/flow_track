import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardPage } from '../pages/DashboardPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { IssuesPage } from '../pages/IssuesPage';
import { KanbanBoardPage } from '../pages/KanbanBoardPage';
import { TasksPage } from '../pages/TasksPage';
import { ClientsPage } from '../pages/ClientsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { useAppDispatch } from '../hooks/useRedux';
import { setCredentials, setAuthLoading } from '../store/authSlice';
import { authService } from '../services/auth.service';

export const AppRoutes: React.FC = () => {
  const dispatch = useAppDispatch();

  // Silent session restore on initial app load using HTTP-only cookie
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const result = await authService.refresh();
        if (isMounted) {
          dispatch(setCredentials(result));
        }
      } catch (_err) {
        if (isMounted) {
          dispatch(setAuthLoading(false));
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  return (
    <Routes>
      {/* Public Guest Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected Workspace Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/issues" element={<IssuesPage />} />
          <Route path="/kanban" element={<KanbanBoardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
