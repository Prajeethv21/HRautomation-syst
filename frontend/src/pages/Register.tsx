import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Lock, Mail, User, CheckCircle, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';

const Register: React.FC = () => {
  const { user, register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const data = await register(name, email, password);
      setSuccessMsg(data.message || 'Registration successful!');
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Registration failed:', err);
      setErrorMsg(err.message || 'Registration failed. Please try again.');
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
            Create ATS Account
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Register for internal recruitment portal
          </p>
        </div>

        {/* Error Alerts */}
        {errorMsg && (
          <div className="w-full bg-[#FFF5F5] border border-[#FFC9C9] text-[#C92A2A] p-4 rounded-2xl flex items-start gap-3 text-xs mb-6 font-semibold leading-relaxed animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="w-full bg-[#F4F9F1] border border-[#D5E8CE] text-[#3E7D28] p-4 rounded-2xl flex flex-col items-center text-center gap-3 text-xs mb-6 font-semibold animate-fade-in">
            <CheckCircle className="w-8 h-8 text-[#6FAF45]" />
            <p className="text-sm font-bold">{successMsg}</p>
            <p className="text-gray-500 font-medium font-jakarta">
              You can now return to the login screen.
            </p>
            <Link to="/login" className="mt-2 w-full">
              <Button variant="primary" className="w-full h-10 text-xs font-bold rounded-xl">
                Go to Login <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        {/* Registration Form */}
        {!successMsg && (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-jakarta">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 text-sm pl-10 pr-4 bg-gray-50 border border-brand-border rounded-2xl focus:border-[#6FAF45]/50 focus:ring-1 focus:ring-[#6FAF45]/20 text-brand-text placeholder-gray-400 font-medium transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

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
                  placeholder="•••••••• (Min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 text-sm pl-10 pr-4 bg-gray-50 border border-brand-border rounded-2xl focus:border-[#6FAF45]/50 focus:ring-1 focus:ring-[#6FAF45]/20 text-brand-text placeholder-gray-400 font-medium transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-jakarta">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
              Register Account
            </Button>
          </form>
        )}

        {/* Login Redirect Link */}
        <div className="mt-8 text-center text-xs font-semibold text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-[#6FAF45] hover:text-[#5f953a] hover:underline font-bold transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
