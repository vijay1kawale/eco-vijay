// FIXED: dark navy/gold theme — was using light background and wrong palette
'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [form, setForm] = React.useState<LoginForm>({ email: '', password: '' });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/admin/auth/login', { email: form.email, password: form.password });
      const { data } = await api.get('/admin/auth/me');
      setUser(data);
      router.push('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr?.response?.data?.error || 'Access denied. Admin credentials required.');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* FIXED: dark navy-950 background with gold radial glow at top */
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundColor: '#0A0F1E',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,168,76,0.15) 0%, transparent 70%)',
      }}
    >
      {/* FIXED: dark card, max-width 420px, subtle gold border glow */}
      <div
        className="w-full max-w-[420px] rounded-2xl p-10"
        style={{
          backgroundColor: '#111827',
          border: '1px solid #1E2D45',
          boxShadow: '0 0 40px rgba(201,168,76,0.06), 0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4"
            style={{ backgroundColor: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)' }}
          >
            <span style={{ color: '#C9A84C', fontSize: 22, fontWeight: 700 }}>E</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#C9A84C' }}>
            Eco Vijay Admin
          </p>
          {/* FIXED: white heading */}
          <h1 className="mt-3 text-3xl font-bold" style={{ color: '#F1F5F9' }}>Welcome back</h1>
          <p className="mt-2 text-sm" style={{ color: '#94A3B8' }}>
            Sign in to manage your team, attendance, and reports.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            {/* FIXED: dark label */}
            <label className="block text-sm font-medium mb-2" style={{ color: '#94A3B8' }}>
              Email
            </label>
            <input
              type="email"
              required
              className="input-default"
              placeholder="admin@ecovijay.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={error ? { borderColor: '#ef4444' } : undefined}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#94A3B8' }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="input-default pr-12"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={error ? { borderColor: '#ef4444' } : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: '#475569' }}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* FIXED: inline red error box below inputs */}
          {error && (
            <div
              className="flex items-start gap-2 rounded-lg p-3 text-sm"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
            >
              <span className="mt-0.5 flex-shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* FIXED: gold Sign In button, full width */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full h-12 text-base"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded-full border-2 border-[#0A0F1E] border-t-transparent animate-spin"
                />
                Signing in…
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs" style={{ color: '#475569' }}>
          Protected admin access — for authorized personnel only
        </p>
      </div>
    </div>
  );
}
