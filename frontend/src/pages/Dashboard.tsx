import React, { useEffect, useState } from 'react';
import { getCandidates, type Candidate } from '../services/googleAppsScript';
import { Users, Clock, Send, UserCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import FlowingConnectionLines from '../components/ui/FlowingConnectionLines';

const Dashboard: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await getCandidates();
      setCandidates(data);
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
  const emailsSent = candidates.filter((c) => c.emailStatus === 'Sent').length;
  const selectedCandidates = candidates.filter((c) => c.status === 'Selected').length;

  const recentCandidates = [...candidates].slice(0, 5); // Display top 5

  const metrics = [
    {
      title: 'Total Candidates',
      value: totalCandidates,
      icon: Users,
      iconBg: 'bg-[#EDF9E8] text-[#6FAF45] border border-[#D7F1C8]',
      badgeText: (
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6FAF45] animate-pulse-dot" />

        </span>
      ),
      badgeClass: 'bg-[#EDF9E8] text-[#6FAF45] border-[#D7F1C8]'
    },
    {
      title: 'Pending Emails',
      value: pendingEmails,

      icon: Clock,
      iconBg: 'bg-[#FCFBF4] text-[#8B7D3A] border border-[#F3F0D3]',
      badgeText: pendingEmails > 0 ? 'Action Required' : 'All Sent',
      badgeClass: pendingEmails > 0
        ? 'bg-[#FCFBF4] text-[#8B7D3A] border-[#F3F0D3]'
        : 'bg-[#EDF9E8] text-[#6FAF45] border-[#D7F1C8]'
    },
    {
      title: 'Emails Sent',
      value: emailsSent,
      subtitle: `${emailsSent} letters dispatched`,
      icon: Send,
      iconBg: 'bg-[#EDF9E8] text-[#6FAF45] border border-[#D7F1C8]',
      badgeClass: 'bg-[#EDF9E8] text-[#6FAF45] border-[#D7F1C8]'
    },
    {
      title: 'Selected Candidates',
      value: selectedCandidates,
      icon: UserCheck,
      iconBg: 'bg-[#F4FAF1] text-[#4E8B3A] border border-[#D9ECCB]',
      badgeText: selectedCandidates > 0 ? 'Onboarding' : 'Complete',
      badgeClass: 'bg-[#F4FAF1] text-[#4E8B3A] border-[#D9ECCB]'
    }
  ];

  return (
    <div className="space-y-8 relative z-10 animate-fade-in">
      {/* Premium Hero Banner */}
      <div className="relative bg-gradient-to-br from-[#F8FFF6] via-[#EDF9E8] to-[#E6F7E2] rounded-3xl p-8 shadow-sm overflow-hidden border border-[#A8D672]/30">
        {/* Connection flow lines animation */}
        <FlowingConnectionLines />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs uppercase font-extrabold tracking-wider text-[#6FAF45] select-none font-jakarta block">
              Deepwoods Green
            </span>

            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-extrabold font-jakarta tracking-tight leading-tight text-[#1C2E24]">
                HR Automation Portal
              </h1>
              <p className="text-[#6FAF45]/90 font-semibold text-sm">
                Automating Joining Letter Operations
              </p>
            </div>
          </div>

          <div className="relative z-10 shrink-0">
            <Link
              to="/candidates"
              className="inline-flex items-center gap-2 text-xs font-extrabold bg-[#6FAF45] text-white px-5 py-3 rounded-2xl hover:bg-[#5f953a] transition-all duration-200 shadow-md active:scale-95 group font-jakarta"
            >
              Manage Candidates Directory
              <ArrowRight className="w-4 h-4 text-white transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs font-medium">
          Error syncing dashboard: {errorMsg}. Please ensure your environment settings are valid.
        </div>
      )}

      {/* Stats Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-brand-border p-6 rounded-2xl shadow-sm h-32 animate-pulse flex flex-col justify-between relative overflow-hidden">
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
          {metrics.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="bg-white border border-brand-border p-6 rounded-2xl shadow-sm hover:shadow-[0_20px_40px_rgba(168,214,114,0.15)] hover:border-brand-accent/30 transition-all duration-300 flex flex-col justify-between cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-jakarta">
                      {card.title}
                    </span>
                    <h3 className="text-3xl font-extrabold text-brand-text mt-1.5 font-jakarta tracking-tight">
                      {card.value}
                    </h3>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-brand-border/60 pt-4 mt-4">
                  <span className="text-xs text-gray-500 font-semibold truncate pr-2">
                    {card.subtitle}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border ${card.badgeClass}`}>
                    {card.badgeText}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

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
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${candidate.emailStatus === 'Sent'
                        ? 'bg-green-50 text-green-700 border-green-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}
                    >
                      {candidate.emailStatus}
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
