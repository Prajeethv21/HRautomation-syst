import React, { useEffect, useState } from 'react';
import { getCandidates, type Candidate } from '../services/googleAppsScript';
import { Users, Clock, Send, UserCheck, ArrowRight, Bot, Code, Megaphone, Palette, Leaf, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DEPARTMENTS } from '../config/departments';
import { useAuth } from '../context/AuthContext';

const DEPARTMENT_ICONS: Record<string, React.ComponentType<any>> = {
  sustainability: Leaf,
  'ai-data-engineer': Bot,
  'web-developer': Code,
  marketing: Megaphone,
  creative: Palette,
  others: Briefcase,
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptStats, setDeptStats] = useState<Record<string, { total: number; selected: number; interviewing: number; onHold: number; rejected: number }>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await getCandidates();
      setCandidates(data);

      // Compute department stats locally from the master candidates list
      const statsMap: Record<string, { total: number; selected: number; interviewing: number; onHold: number; rejected: number }> = {};
      for (const dept of DEPARTMENTS) {
        const deptCandidates = data.filter(c => dept.roles.includes(c.role));
        statsMap[dept.id] = {
          total: deptCandidates.length,
          selected: deptCandidates.filter(c => c.status === 'Selected').length,
          interviewing: deptCandidates.filter(c => c.status === 'Interviewing' || c.status === 'Submitted' || c.status === 'Shortlisted' || c.status === 'Scheduled').length,
          onHold: deptCandidates.filter(c => c.status === 'On Hold').length,
          rejected: deptCandidates.filter(c => c.status === 'Rejected').length
        };
      }
      setDeptStats(statsMap);
    } catch (err: any) {
      console.error('Failed to load dashboard statistics:', err);
      setErrorMsg('Unable to connect to Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleUpdate = () => {
      fetchDashboardData();
    };
    window.addEventListener('candidate-updated', handleUpdate);
    return () => {
      window.removeEventListener('candidate-updated', handleUpdate);
    };
  }, []);

  // Calculate stats from live Google Sheets data
  const totalCandidates = candidates.length;
  const pendingEmails = candidates.filter((c) => c.emailStatus === 'Pending').length;
  // Fix Emails Sent metric bug: check if status contains "Sent" or is "Interview Scheduled"
  const emailsSent = candidates.filter((c) => 
    c.emailStatus && (
      c.emailStatus.toLowerCase().includes('sent') || 
      c.emailStatus === 'Interview Scheduled'
    )
  ).length;
  const selectedCandidates = candidates.filter((c) => c.status === 'Selected').length;

  const recentCandidates = [...candidates].slice(0, 5); // Display top 5

  const metrics = [
    {
      title: 'Total Candidates',
      value: totalCandidates,
      icon: Users,
      badgeText: 'Active',
      badgeClass: 'border-brand/30 text-brand bg-white',
      subtitle: 'All departments'
    },
    {
      title: 'Pending Emails',
      value: pendingEmails,
      icon: Clock,
      badgeText: pendingEmails > 0 ? 'Action Required' : 'All Sent',
      badgeClass: pendingEmails > 0
        ? 'border-amber-200 text-amber-700 bg-white'
        : 'border-brand/30 text-brand bg-white',
      subtitle: 'Requires attention'
    },
    {
      title: 'Emails Sent',
      value: emailsSent,
      icon: Send,
      badgeText: 'Dispatched',
      badgeClass: 'border-blue-200 text-blue-700 bg-white',
      subtitle: `${emailsSent} letters dispatched`
    },
    {
      title: 'Selected Candidates',
      value: selectedCandidates,
      icon: UserCheck,
      badgeText: 'Onboarding',
      badgeClass: 'border-brand/30 text-brand bg-white',
      subtitle: 'Qualified hires'
    }
  ];

  return (
    <div className="space-y-8 relative z-10">
      {/* Welcome Banner */}
      <div className="select-none px-1 pt-1">
        <div className="space-y-2 max-w-2xl">
          <span className="inline-block text-[10px] uppercase font-extrabold tracking-[0.15em] text-brand font-jakarta">
            DEEPWOODS GREEN • {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-brand-text font-jakarta tracking-tight leading-tight">
            Welcome back, {user?.name || 'Anbunathan'}.
          </h2>
          <p className="text-gray-500 font-medium text-sm md:text-base leading-relaxed">
            You have <span className="font-extrabold text-brand">{pendingEmails} pending emails</span> and {selectedCandidates} candidates ready for onboarding across {DEPARTMENTS.length} departments.
          </p>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs font-medium">
          Error syncing dashboard: {errorMsg}. Please ensure your environment settings are valid.
        </div>
      )}

      {/* Stats Cards Grid (Animations and Framer Motion Removed) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] p-6 rounded-2xl shadow-sm h-[160px] animate-pulse flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="space-y-3 w-2/3">
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded w-3/4" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-200" />
              </div>
              <div className="h-3 bg-gray-200 rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-white border border-[#E5E7EB] p-6 rounded-2xl shadow-sm h-[160px] hover:border-brand hover:shadow-sm transition-all duration-200 flex flex-col justify-between cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-jakarta">
                      {card.title}
                    </span>
                    <h3 className="text-3xl font-extrabold text-[#111111] mt-1.5 font-jakarta tracking-tight">
                      {card.value}
                    </h3>
                  </div>
                  <Icon className="w-6 h-6 text-brand shrink-0" />
                </div>

                <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-4">
                  <span className="text-xs text-gray-500 font-medium truncate pr-2">
                    {card.subtitle}
                  </span>
                  {card.badgeText && (
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border shrink-0 ${card.badgeClass}`}>
                      {card.badgeText}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Department Cards Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-brand-text font-jakarta">
          Departments Directory
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-brand-border p-6 rounded-2xl shadow-sm h-[196px] animate-pulse flex flex-col justify-between" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DEPARTMENTS.map((dept) => {
              const stats = deptStats[dept.id] || { total: 0, selected: 0, interviewing: 0, onHold: 0, rejected: 0 };
              const DeptIcon = DEPARTMENT_ICONS[dept.id] || Briefcase;
              return (
                <Link to={`/departments/${dept.id}`} key={dept.id}>
                  <div
                    className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-sm hover:border-brand hover:shadow-md transition-all duration-200 flex flex-col justify-between h-[196px] select-none cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-bold text-brand-text mt-1 font-jakarta truncate max-w-[160px]">
                          {dept.name}
                        </h4>
                      </div>
                      {dept.id === 'sustainability' ? (
                        <img src="/favicon.png" className="w-5 h-5 object-contain shrink-0 mt-1" alt="Deepwoods Leaf Logo" />
                      ) : (
                        <DeptIcon className="w-5 h-5 text-brand shrink-0 mt-1" />
                      )}
                    </div>
 
                    <div className="mt-4 pt-4 border-t border-brand-border/60">
                      <div className="flex items-center justify-between text-xs mb-3 font-semibold text-gray-600">
                        <span>Total Candidates</span>
                        <span className="text-sm font-extrabold text-[#1B4332]">{stats.total}</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        <div className="bg-white border border-[#E5E7EB] rounded-xl px-1 py-1.5 text-center flex flex-col items-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                          <span className="text-[8px] font-extrabold uppercase tracking-wide text-gray-500 flex items-center gap-1 justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                            Selected
                          </span>
                          <span className="text-xs font-extrabold mt-0.5 text-gray-900">{stats.selected}</span>
                        </div>
                        <div className="bg-white border border-[#E5E7EB] rounded-xl px-1 py-1.5 text-center flex flex-col items-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                          <span className="text-[8px] font-extrabold uppercase tracking-wide text-gray-500 flex items-center gap-1 justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                            Interview
                          </span>
                          <span className="text-xs font-extrabold mt-0.5 text-gray-900">{stats.interviewing}</span>
                        </div>
                        <div className="bg-white border border-[#E5E7EB] rounded-xl px-1 py-1.5 text-center flex flex-col items-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                          <span className="text-[8px] font-extrabold uppercase tracking-wide text-gray-500 flex items-center gap-1 justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                            On Hold
                          </span>
                          <span className="text-xs font-extrabold mt-0.5 text-gray-900">{stats.onHold}</span>
                        </div>
                        <div className="bg-white border border-[#E5E7EB] rounded-xl px-1 py-1.5 text-center flex flex-col items-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                          <span className="text-[8px] font-extrabold uppercase tracking-wide text-gray-500 flex items-center gap-1 justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                            Rejected
                          </span>
                          <span className="text-xs font-extrabold mt-0.5 text-gray-900">{stats.rejected}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white border border-brand-border rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-brand-text font-jakarta">
              Recently Added Candidates
            </h3>
            <Link to="/candidates" className="text-xs font-bold text-brand hover:underline flex items-center gap-1 active:scale-[0.98]">
              View All Candidates
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentCandidates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No candidates found.</div>
          ) : (
            <div className="divide-y divide-brand-border">
              {recentCandidates.map((candidate, idx) => (
                <div key={`${candidate.email}-${idx}`} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0 hover:bg-brand-light/20 px-3 rounded-xl transition-all duration-200">
                  <div>
                    <h4 className="text-sm font-bold text-brand-text font-jakarta">{candidate.candidateName}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{candidate.role} • {candidate.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${candidate.emailStatus && candidate.emailStatus.toLowerCase().includes('sent')
                        ? 'bg-green-50 text-green-700 border-green-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}
                    >
                      {candidate.emailStatus || 'Pending'}
                    </span>
                    <Link
                      to="/candidates"
                      className="p-1.5 rounded-xl text-gray-400 hover:bg-brand-light hover:text-brand-primary transition-colors duration-200 active:scale-[0.9]"
                      title="Inspect Candidate"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
