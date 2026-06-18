import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already authenticated, redirect immediately to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        login(data.token, data.user);
        navigate('/dashboard');
      } else {
        setErrorMsg(data.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      console.error('Login request failed:', err);
      setErrorMsg('Unable to connect to the authentication server. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-jakarta bg-white select-none">
      {/* Left Column - Form Section (60%) */}
      <div className="w-full lg:w-[60%] flex flex-col justify-between p-8 md:p-16 bg-white relative z-10 min-h-screen">
        {/* Deepwoods branding header */}
        <div className="flex items-center justify-between">
          <img src="/DeepwoodsR.png" alt="Deepwoods Logo" className="h-12 object-contain select-none" />
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider font-jakarta">
            Recruitment Portal
          </span>
        </div>

        <div className="max-w-md w-full mx-auto my-auto py-12 space-y-8">
          {/* Top Switcher Tabs */}
          <div className="flex items-center gap-6 border-b border-gray-150 pb-3">
            <span className="text-sm font-extrabold text-gray-900 pb-3 border-b-2 border-[#91ba30] cursor-pointer">
              Sign in
            </span>
            <Link to="/register" className="text-sm font-semibold text-gray-400 hover:text-gray-600 pb-3 border-b-2 border-transparent cursor-pointer">
              Register
            </Link>
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Sign in to Deepwoods
            </h2>
          </div>

          {/* Errors */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs font-semibold leading-relaxed animate-fade-in">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block font-jakarta">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="hr@deepwoodsgreen.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 text-sm px-4 bg-white border border-gray-200 rounded-xl focus:border-[#91ba30] focus:ring-2 focus:ring-[#91ba30]/10 text-gray-800 placeholder-gray-400 font-medium transition-all focus:outline-none"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block font-jakarta">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 text-sm px-4 bg-white border border-gray-200 rounded-xl focus:border-[#91ba30] focus:ring-2 focus:ring-[#91ba30]/10 text-gray-800 placeholder-gray-400 font-medium transition-all focus:outline-none"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#91ba30] hover:bg-[#91ba30]/90 text-white active:scale-[0.98] rounded-xl text-sm font-extrabold tracking-wide transition-all mt-6 shadow-sm flex items-center justify-center focus:outline-none"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Small Screen Copyright only, as left column is hidden on mobile */}
        <div className="text-[10px] text-gray-400 text-center lg:hidden select-none">
          © {new Date().getFullYear()} Deepwoods Green Initiatives. All rights reserved.
        </div>
      </div>

      {/* Right Column - Initiatives Copy Overlay (40%) */}
      <div className="hidden lg:flex lg:w-[40%] text-white p-12 flex-col justify-between relative overflow-hidden shrink-0 bg-[#0a0f0d]">
        {/* Organic wave divider SVG overlay */}
        <div className="absolute top-0 bottom-0 left-0 h-full w-24 text-white fill-current z-20 pointer-events-none">
          <svg className="h-full w-full" viewBox="0 0 100 1000" preserveAspectRatio="none">
            <path d="M0 0 L100 0 C30 250, 70 750, 0 1000 Z" />
          </svg>
        </div>

        {/* Overlapping circular outlines */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] rounded-full border-[50px] border-[#91ba30]/[0.05] pointer-events-none z-20" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 w-[360px] h-[360px] rounded-full border-[24px] border-white/[0.02] pointer-events-none z-20" />

        {/* Content wrapper with left padding to prevent wavy divider overlap */}
        <div className="z-30 flex-1 flex flex-col justify-between pl-20">
          {/* Initiatives Top Label */}
          <div className="flex items-center gap-2">
            <span className="w-5 h-[2px] bg-[#91ba30] block"></span>
            <span className="text-xs font-bold text-[#91ba30] uppercase tracking-widest font-jakarta">
              Deepwoods Green Initiatives
            </span>
          </div>

          {/* Initiatives Message */}
          <div className="space-y-6 max-w-xs my-auto">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.15] text-white">
              Cultivating <br />
              careers for <span className="italic text-[#91ba30]">a greener</span> <br />
              <span className="text-[#91ba30]">tomorrow.</span>
            </h1>
            <p className="text-xs md:text-sm text-gray-300 font-medium leading-relaxed max-w-xs">
              Connecting passionate talent with sustainable opportunities that make a lasting environmental impact.
            </p>
          </div>

          {/* Copyright footer */}
          <div className="text-[10px] text-gray-500 font-medium">
            © {new Date().getFullYear()} Deepwoods Green Initiatives. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
