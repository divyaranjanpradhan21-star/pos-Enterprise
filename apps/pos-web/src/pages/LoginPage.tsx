import { useState, type FormEvent } from 'react';
import { ChefHat, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { api } from '../lib/api';
import { ApiError } from '../lib/api';

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenantId: string;
    branchId: string;
  };
}

export default function LoginPage() {
  const { login } = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.post<LoginResponse>('/auth/login', { email, password });
      login({ ...data.user, token: data.accessToken });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 p-4">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-purple-600/15 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center shadow-glow-brand">
            <ChefHat size={32} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Restro POS</h1>
            <p className="text-slate-400 text-sm mt-1">Enterprise Restaurant Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-slide-down">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-slate-400">Email address</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="cashier@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-slate-400">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  id="btn-toggle-password"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="btn-primary w-full btn-lg mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Contact your system administrator to reset your password.
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © 2024 Restro POS Enterprise · Multi-tenant · Offline-tolerant
        </p>
      </div>
    </div>
  );
}
