import React, { useEffect, useState, useMemo, useRef } from 'react';
import { getCandidates, sendJoiningLetter, sendRejectionEmail, updateCandidateStatus, type Candidate } from '../services/googleAppsScript';
import { Search, Filter, RefreshCw, Eye, Send, AlertCircle, Users, Check, Clock, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import CandidateDetailsModal from '../components/CandidateDetailsModal';
import { useToast } from '../components/ui/Toast';

// Returns tailwind classes for each status badge — mirrors Google Sheets values exactly
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'Selected':
      return 'bg-[#EDF9E8] text-[#2D6A2D] border-[#D7F1C8]';
    case 'Not Selected':
      return 'bg-[#FFF5F5] text-[#C92A2A] border-[#FFC9C9]';
    case 'Maybe':
      return 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]';
    default:
      return 'bg-[#F4F7F5] text-gray-500 border-[#E3ECE6]';
  }
};

// Google Sheets is the single source of truth — these are the only valid status values
const SHEET_STATUS_OPTIONS = ['Selected', 'Not Selected', 'Maybe'] as const;



const Candidates: React.FC = () => {
  const { showToast } = useToast();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [emailStatusFilter, setEmailStatusFilter] = useState('');

  // Filter Popover state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState('');
  const [tempEmailStatusFilter, setTempEmailStatusFilter] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Selected candidate for modal actions
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Action status tracking (keyed by email to avoid collisions)
  const [sendingLetterEmail, setSendingLetterEmail] = useState<string | null>(null);
  const [sendingRejectionEmail, setSendingRejectionEmail] = useState<string | null>(null);

  const fetchCandidatesData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setErrorMsg(null);

      const data = await getCandidates();
      setCandidates(data);
    } catch (err: any) {
      console.error('Failed to load candidates:', err);
      setErrorMsg('Unable to connect to Google Sheets');
      showToast('Unable to connect to Google Sheets', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCandidatesData();
  }, []);

  // Monitor outside clicks to auto-close the Filters dropdown popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, emailStatusFilter]);

  // Filter candidates list
  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const nameMatch = candidate.candidateName ? candidate.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const emailMatch = candidate.email ? candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const roleMatch = candidate.role ? candidate.role.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const matchesSearch = nameMatch || emailMatch || roleMatch;

      const matchesStatus = statusFilter === '' || candidate.status === statusFilter;
      const matchesEmailStatus = emailStatusFilter === '' || candidate.emailStatus === emailStatusFilter;

      return matchesSearch && matchesStatus && matchesEmailStatus;
    });
  }, [candidates, searchQuery, statusFilter, emailStatusFilter]);

  // Paginated list
  const paginatedCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCandidates.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCandidates, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / itemsPerPage));

  // Send Joining Letter handler (unchanged)
  const handleSendJoiningLetter = async (email: string, name: string) => {
    try {
      setSendingLetterEmail(email);
      showToast(`Generating and sending joining letter for ${name}...`, 'info');

      const index = candidates.findIndex((c) => c.email === email);
      if (index === -1) throw new Error('Candidate not found');
      const rowNumber = index + 2;

      const response = await sendJoiningLetter(rowNumber);

      if (response.success) {
        showToast('Joining Letter Sent Successfully', 'success');
        await fetchCandidatesData(true);
        window.dispatchEvent(new Event('candidate-updated'));
      } else {
        showToast('Failed To Send Joining Letter', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Failed To Send Joining Letter', 'error');
    } finally {
      setSendingLetterEmail(null);
    }
  };

  // Send Rejection Email handler (new)
  const handleSendRejectionEmail = async (email: string, name: string) => {
    try {
      setSendingRejectionEmail(email);
      showToast(`Sending rejection email to ${name}...`, 'info');

      const response = await sendRejectionEmail(email);

      if (response.success) {
        showToast('Rejection Email Sent Successfully', 'success');
        await fetchCandidatesData(true);
        window.dispatchEvent(new Event('candidate-updated'));
      } else {
        showToast('Failed To Send Rejection Email', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Failed To Send Rejection Email', 'error');
    } finally {
      setSendingRejectionEmail(null);
    }
  };

  // Render dynamic action button — driven by Google Sheets status value
  const renderActionButton = (candidate: Candidate) => {
    const isSendingLetter = sendingLetterEmail === candidate.email;
    const isSendingRejection = sendingRejectionEmail === candidate.email;

    // Email already sent — show locked state regardless of status
    if (candidate.emailStatus === 'Sent') {
      return (
        <Button variant="outline" size="sm" disabled className="opacity-60 cursor-not-allowed">
          <Check className="w-3.5 h-3.5 mr-1 inline" />
          Email Sent
        </Button>
      );
    }

    // Selected → Send Joining Letter
    if (candidate.status === 'Selected') {
      return (
        <Button
          variant="primary"
          size="sm"
          isLoading={isSendingLetter}
          onClick={() => handleSendJoiningLetter(candidate.email, candidate.candidateName)}
          icon={<Send className="w-3.5 h-3.5" />}
          className="active:scale-[0.95]"
        >
          Send Letter
        </Button>
      );
    }

    // Not Selected → Send Rejection Email
    if (candidate.status === 'Not Selected') {
      return (
        <button
          disabled={isSendingRejection}
          onClick={() => handleSendRejectionEmail(candidate.email, candidate.candidateName)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-[#FFC9C9] bg-[#FFF5F5] text-[#C92A2A] hover:bg-[#FFE5E5] transition-all duration-200 active:scale-[0.95] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSendingRejection ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <XCircle className="w-3.5 h-3.5" />
          )}
          {isSendingRejection ? 'Sending...' : 'Send Rejection'}
        </button>
      );
    }

    // Maybe → Disabled "Pending Decision"
    if (candidate.status === 'Maybe') {
      return (
        <button
          disabled
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-[#FDE68A] bg-[#FFFBEB] text-[#92400E] opacity-70 cursor-not-allowed"
        >
          <Clock className="w-3.5 h-3.5" />
          Pending Decision
        </button>
      );
    }

    // Unknown status from sheet — show disabled fallback
    return (
      <Button variant="outline" size="sm" disabled className="opacity-50 cursor-not-allowed">
        <Clock className="w-3.5 h-3.5 mr-1 inline" />
        Pending
      </Button>
    );
  };


  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top action/filters bar */}
      <div className="bg-white border border-brand-border p-5 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm pl-10 pr-4 py-2.5 bg-[#EDF9E8]/15 border border-brand-border rounded-2xl focus:border-[#6FAF45]/40 text-brand-text placeholder-gray-400 font-medium"
          />
        </div>

        {/* Filters Toolbar */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Custom Dropdown Filters Popover */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => {
                setIsFilterOpen(!isFilterOpen);
                if (!isFilterOpen) {
                  setTempStatusFilter(statusFilter);
                  setTempEmailStatusFilter(emailStatusFilter);
                }
              }}
              className={`flex items-center gap-2.5 px-4.5 py-2.5 border rounded-2xl text-sm font-semibold transition-all duration-200 select-none active:scale-[0.98] ${
                isFilterOpen || statusFilter || emailStatusFilter
                  ? 'bg-[#EDF9E8] border-[#A8D672]/50 text-[#1B4332] shadow-sm font-bold'
                  : 'bg-white border-brand-border text-gray-600 hover:bg-[#EDF9E8]/35'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {(statusFilter || emailStatusFilter) && (
                <span className="w-2 h-2 rounded-full bg-[#6FAF45]" />
              )}
            </button>

            {/* Filter popover container */}
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="absolute right-0 mt-3 w-64 bg-white border border-brand-border rounded-3xl shadow-[0_20px_48px_rgba(168,214,114,0.15)] p-5 z-30 space-y-4"
                >
                  {/* Candidate Status Filter */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-jakarta">
                      Candidate Status
                    </span>
                    <div className="grid grid-cols-1 gap-0.5">
                      {[
                        { label: 'All Statuses', value: '', dot: null },
                        { label: 'Selected', value: 'Selected', dot: 'bg-[#6FAF45]' },
                        { label: 'Not Selected', value: 'Not Selected', dot: 'bg-[#C92A2A]' },
                        { label: 'Maybe', value: 'Maybe', dot: 'bg-[#D97706]' },
                      ].map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setTempStatusFilter(s.value)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold text-left transition-colors ${
                            tempStatusFilter === s.value
                              ? 'bg-[#EDF9E8] text-[#1B4332]'
                              : 'text-gray-600 hover:bg-[#EDF9E8]/20'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {s.dot && <span className={`w-2 h-2 rounded-full ${s.dot}`} />}
                            {s.label}
                          </span>
                          {tempStatusFilter === s.value && <Check className="w-3.5 h-3.5 text-[#6FAF45]" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Email Status Filter */}
                  <div className="space-y-2 border-t border-brand-border/60 pt-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-jakarta">
                      Email Status
                    </span>
                    <div className="grid grid-cols-1 gap-0.5">
                      {[
                        { label: 'All Statuses', value: '' },
                        { label: 'Pending', value: 'Pending' },
                        { label: 'Sent', value: 'Sent' }
                      ].map((s) => (
                        <button
                          key={s.label}
                          onClick={() => setTempEmailStatusFilter(s.value)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold text-left transition-colors ${
                            tempEmailStatusFilter === s.value
                              ? 'bg-[#EDF9E8] text-[#1B4332]'
                              : 'text-gray-600 hover:bg-[#EDF9E8]/20'
                          }`}
                        >
                          <span>{s.label}</span>
                          {tempEmailStatusFilter === s.value && <Check className="w-3.5 h-3.5 text-[#6FAF45]" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filter Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-brand-border/60">
                    <button
                      onClick={() => {
                        setTempStatusFilter('');
                        setTempEmailStatusFilter('');
                        setStatusFilter('');
                        setEmailStatusFilter('');
                        setIsFilterOpen(false);
                        showToast('Filters reset successfully', 'info');
                      }}
                      className="flex-1 px-3 py-2 text-xs font-bold text-gray-500 border border-brand-border bg-white rounded-xl hover:bg-[#EDF9E8]/30 transition-all select-none active:scale-[0.98]"
                    >
                      Reset Filters
                    </button>
                    <button
                      onClick={() => {
                        setStatusFilter(tempStatusFilter);
                        setEmailStatusFilter(tempEmailStatusFilter);
                        setIsFilterOpen(false);
                        showToast('Filters applied successfully', 'success');
                      }}
                      className="flex-1 px-3 py-2 text-xs font-bold text-white bg-[#6FAF45] border border-[#6FAF45]/10 rounded-xl hover:bg-[#5f953a] transition-all select-none active:scale-[0.98]"
                    >
                      Apply Filters
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sync Trigger Button */}
          <button
            onClick={() => fetchCandidatesData(true)}
            disabled={refreshing}
            className="p-2.5 border border-brand-border rounded-2xl bg-white hover:bg-[#EDF9E8]/40 text-gray-500 hover:text-[#6FAF45] transition-all shrink-0 disabled:opacity-40 active:scale-[0.95] flex items-center justify-center"
            title="Refresh candidate data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Integration Error Notice */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 shadow-sm text-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <h4 className="font-bold font-poppins mb-0.5">Google Sheets Synchronization Failure</h4>
            <p>{errorMsg}. Please ensure your environment settings match your deployed script Web App.</p>
          </div>
        </div>
      )}

      {/* Responsive Candidates Table */}
      <div className="bg-white border border-brand-border rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-bg/40 border-b border-brand-border">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Candidate Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Joining Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Email Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right font-jakarta">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4.5"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-6 py-4.5"><div className="h-3 bg-gray-200 rounded w-36" /></td>
                    <td className="px-6 py-4.5"><div className="h-3 bg-gray-200 rounded w-24" /></td>
                    <td className="px-6 py-4.5"><div className="h-3 bg-gray-200 rounded w-20" /></td>
                    <td className="px-6 py-4.5"><div className="h-5 bg-gray-200 rounded-full w-16" /></td>
                    <td className="px-6 py-4.5"><div className="h-5 bg-gray-200 rounded-full w-14" /></td>
                    <td className="px-6 py-4.5 text-right flex justify-end gap-2"><div className="h-8 bg-gray-200 rounded-lg w-14" /><div className="h-8 bg-gray-200 rounded-lg w-24" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-brand-text font-jakarta">No Candidates Found</p>
            <p className="text-xs text-gray-400 mt-1">Try clearing your filters or searches.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-bg/40 border-b border-brand-border">
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Candidate Name</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Email</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Role</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Joining Date</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Status</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Email Status</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right font-jakarta">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {paginatedCandidates.map((candidate, idx) => (
                  <tr key={`${candidate.email}-${candidate.joiningDate}-${idx}`} className="hover:bg-brand-light/20 hover:translate-x-0.5 transition-all duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-text font-jakarta">{candidate.candidateName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{candidate.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-gray-600">{candidate.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {candidate.joiningDate ? new Date(candidate.joiningDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* Dropdown — Styled like a Google Sheets colored chip, acts as the sole status indicator */}
                      <select
                        value={candidate.status}
                        onChange={e => {
                          const newStatus = e.target.value;
                          const updatedCandidates = candidates.map(c =>
                            c.email === candidate.email ? { ...c, status: newStatus } : c
                          );
                          setCandidates(updatedCandidates);
                          updateCandidateStatus(candidate.email, newStatus)
                            .then(() => {
                              showToast(`Status updated to ${newStatus}`, 'success');
                              fetchCandidatesData(true);
                            })
                            .catch(err => {
                              console.error('Status update failed', err);
                              showToast('Failed to update status', 'error');
                              fetchCandidatesData(true);
                            });
                        }}
                        className={`text-xs font-bold py-1 pl-3.5 pr-8 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6FAF45]/50 transition-colors duration-200 select-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%234B5563%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[right_8px_center] bg-no-repeat bg-[length:14px_14px] ${getStatusBadgeClass(candidate.status)}`}
                      >
                        {SHEET_STATUS_OPTIONS.map(opt => (
                          <option key={opt} value={opt} className="bg-white text-gray-800 font-semibold text-xs">{opt}</option>
                        ))}
                        {/* If the sheet has a value not in our list, keep it selectable */}
                        {!SHEET_STATUS_OPTIONS.includes(candidate.status as any) && candidate.status && (
                          <option value={candidate.status} className="bg-white text-gray-800 font-semibold text-xs">{candidate.status}</option>
                        )}
                      </select>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${
                        candidate.emailStatus === 'Sent'
                          ? 'bg-[#EDF9E8] text-[#6FAF45] border-[#D7F1C8]'
                          : candidate.emailStatus === 'Failed'
                          ? 'bg-[#FFF5F5] text-[#C92A2A] border-[#FFC9C9]'
                          : 'bg-[#F8FFF6] text-[#A8D672] border-[#E6F7E2]'
                      }`}>
                        {candidate.emailStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex justify-end gap-2">
                        {/* View Action */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCandidate(candidate);
                            setIsDetailsOpen(true);
                          }}
                          icon={<Eye className="w-3.5 h-3.5" />}
                          className="active:scale-[0.95]"
                        >
                          View
                        </Button>

                        {/* Dynamic status-driven action button */}
                        {renderActionButton(candidate)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {!loading && filteredCandidates.length > 0 && (
          <div className="px-6 py-4 bg-brand-bg/10 border-t border-brand-border flex items-center justify-between text-xs font-semibold text-gray-500">
            <div>
              Showing {Math.min(filteredCandidates.length, (currentPage - 1) * itemsPerPage + 1)} to{' '}
              {Math.min(filteredCandidates.length, currentPage * itemsPerPage)} of {filteredCandidates.length}{' '}
              candidates
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-xl border border-brand-border bg-white hover:bg-brand-light disabled:opacity-45 active:scale-[0.95]"
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-xl border transition-all duration-150 active:scale-[0.95] ${
                    currentPage === i + 1
                      ? 'bg-brand-primary text-white border-brand-primary font-extrabold'
                      : 'border-brand-border bg-white hover:bg-brand-light text-gray-600'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-xl border border-brand-border bg-white hover:bg-brand-light disabled:opacity-45 active:scale-[0.95]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Candidate Details Modal */}
      <CandidateDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        candidate={selectedCandidate}
        onSendLetter={async (email) => {
          setIsDetailsOpen(false);
          if (selectedCandidate) {
            await handleSendJoiningLetter(email, selectedCandidate.candidateName);
          }
        }}
        onSendRejection={async (email) => {
          setIsDetailsOpen(false);
          if (selectedCandidate) {
            await handleSendRejectionEmail(email, selectedCandidate.candidateName);
          }
        }}
      />
    </div>
  );
};

export default Candidates;
