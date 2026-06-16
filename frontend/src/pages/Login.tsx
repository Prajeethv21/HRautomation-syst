import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import Button from '../components/ui/Button';

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
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-6 relative overflow-hidden font-jakarta select-none">
      {/* Decorative Brand Leaf Blur Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#8CC63F]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#6FAF45]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full bg-white rounded-3xl border border-brand-border p-10 shadow-[0_20px_50px_rgba(140,198,63,0.08)] z-10 flex flex-col items-center">
        {/* Brand Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/Deepwoodsgreen.jpeg" 
            alt="Deepwoods Green Logo" 
            className="h-16 w-auto object-contain mb-3"
          />
          <h2 className="text-xl font-bold text-brand-text font-jakarta mt-2">
            Sign In to ATS Portal
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Access candidate pipeline and scheduling
          </p>
        </div>

        {/* Error Alerts */}
        {errorMsg && (
          <div className="w-full bg-[#FFF5F5] border border-[#FFC9C9] text-[#C92A2A] p-4 rounded-2xl flex items-start gap-3 text-xs mb-6 font-semibold leading-relaxed animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-jakarta">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="hr@deepwoodsgreen.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 text-sm pl-10 pr-4 bg-gray-50 border border-brand-border rounded-2xl focus:border-[#6FAF45]/50 focus:ring-1 focus:ring-[#6FAF45]/20 text-brand-text placeholder-gray-400 font-medium transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-jakarta">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 text-sm pl-10 pr-4 bg-gray-50 border border-brand-border rounded-2xl focus:border-[#6FAF45]/50 focus:ring-1 focus:ring-[#6FAF45]/20 text-brand-text placeholder-gray-400 font-medium transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full h-11 text-sm font-bold rounded-2xl shadow-sm hover:shadow active:scale-[0.98] mt-3"
            isLoading={loading}
          >
            Sign In
          </Button>
        </form>

        {/* Registration Redirect Link */}
        <div className="mt-8 text-center text-xs font-semibold text-gray-400">
          Need portal access?{' '}
          <Link to="/register" className="text-[#6FAF45] hover:text-[#5f953a] hover:underline font-bold transition-colors">
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
