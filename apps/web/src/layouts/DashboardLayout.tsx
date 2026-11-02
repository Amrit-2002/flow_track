import React, { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Kanban,
  ListTodo,
  Building2,
  User,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  Layers,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { useSocketInit } from '../hooks/useSocket';
import { toggleTheme } from '../store/themeSlice';
import { logout } from '../store/authSlice';
import { cn } from '../utils/cn';

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', to: '/projects', icon: FolderKanban },
  { name: 'Issues', to: '/issues', icon: CheckSquare },
  { name: 'Kanban Board', to: '/kanban', icon: Kanban },
  { name: 'Task Tracker', to: '/tasks', icon: ListTodo },
  { name: 'Clients', to: '/clients', icon: Building2 },
];

export const DashboardLayout: React.FC = () => {
  useSocketInit();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useAppSelector((state) => state.theme.mode);
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <Layers className="w-6 h-6 text-brand-600" />
          <span className="font-bold text-lg tracking-tight">FlowTrack</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => dispatch(toggleTheme())}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">FlowTrack</span>
              <span className="block text-[10px] text-slate-400 -mt-1 font-medium uppercase tracking-wider">
                Enterprise
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                )
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <Link
              to="/profile"
              className="flex items-center space-x-3 overflow-hidden p-1 -m-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-1"
            >
              <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 flex items-center justify-center font-semibold text-xs flex-shrink-0 border border-brand-200 dark:border-brand-900">
                {user ? user.name.slice(0, 2).toUpperCase() : 'FT'}
              </div>
              <div className="truncate text-left">
                <p className="text-sm font-semibold truncate leading-tight">{user?.name || 'Sign In'}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email || 'Guest'}</p>
              </div>
            </Link>

            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer ml-1"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex gap-2">
            <Link
              to="/profile"
              className="flex-1 flex items-center justify-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-800"
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
