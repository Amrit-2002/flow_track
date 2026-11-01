import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { loginSchema, LoginInput } from '@flowtrack/shared';
import { authService } from '../services/auth.service';
import { useAppDispatch } from '../hooks/useRedux';
import { setCredentials } from '../store/authSlice';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';
import axios from 'axios';

export const LoginPage: React.FC = () => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setIsSubmitting(true);
      setServerError(null);

      const result = await authService.login(data);
      dispatch(setCredentials(result));
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error?.message) {
        setServerError(err.response.data.error.message);
      } else {
        setServerError('Unable to connect to server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (role: 'admin' | 'manager' | 'user') => {
    if (role === 'admin') {
      setValue('email', 'admin@flowtrack.dev');
      setValue('password', 'Password123!');
    } else if (role === 'manager') {
      setValue('email', 'manager@flowtrack.dev');
      setValue('password', 'Password123!');
    } else {
      setValue('email', 'user@flowtrack.dev');
      setValue('password', 'Password123!');
    }
    setServerError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Sign In to your account</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Enter your credentials to access your projects and issues.
        </p>
      </div>

      {/* Quick Fill Demo Accounts */}
      <div className="p-3 bg-brand-50 dark:bg-brand-950/40 rounded-xl border border-brand-100 dark:border-brand-900/50">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick Demo Access (Click to Fill):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickFill('admin')}
            className="px-2 py-1 text-[11px] font-medium rounded-md bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 hover:bg-brand-50 shadow-xs cursor-pointer"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('manager')}
            className="px-2 py-1 text-[11px] font-medium rounded-md bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 hover:bg-brand-50 shadow-xs cursor-pointer"
          >
            Manager
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('user')}
            className="px-2 py-1 text-[11px] font-medium rounded-md bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 hover:bg-brand-50 shadow-xs cursor-pointer"
          >
            User
          </button>
        </div>
      </div>

      {serverError && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start space-x-2.5 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Email Address
          </label>
          <input
            type="email"
            {...register('email')}
            placeholder="admin@flowtrack.dev"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
          </div>
          <input
            type="password"
            {...register('password')}
            placeholder="••••••••"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
        </button>
      </form>

      <div className="text-center text-xs text-slate-500">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
          Create one now
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
