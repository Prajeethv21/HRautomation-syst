import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  getDepartmentCandidates, sendJoiningLetter, sendRejectionEmail, sendInterviewEmail,
  updateCandidateStatus, type DepartmentCandidate 
} from '../services/googleAppsScript';
import { DEPARTMENTS } from '../config/departments';
import { 
  Users, CheckCircle, XCircle, Clock, Send, 
  RefreshCw, Search, ExternalLink, ChevronRight, AlertCircle, Filter, Check, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import CandidateDetailsModal from '../components/CandidateDetailsModal';

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'Submitted':
      return 'bg-gray-50 text-gray-700 border-gray-100';
    case 'Shortlisted':
      return 'bg-sky-50 text-sky-700 border-sky-100';
    case 'Scheduled':
      return 'bg-purple-50 text-purple-700 border-purple-100';
    case 'Interviewing':
      return 'bg-sky-50 text-sky-700 border-sky-100';
    case 'Selected':
      return 'bg-[#EDF9E8] text-[#2D6A2D] border-[#D7F1C8]';
    case 'Rejected':
      return 'bg-[#FFF5F5] text-[#C92A2A] border-[#FFC9C9]';
    case 'On Hold':
      return 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]';
    default:
      return 'bg-[#F4F7F5] text-gray-500 border-[#E3ECE6]';
  }
};


const SHEET_STATUS_OPTIONS = [
  'Submitted',
  'Shortlisted',
  'Scheduled',
  'On Hold',
  'Selected',
  'Rejected'
] as const;

const DepartmentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const department = useMemo(() => {
    return DEPARTMENTS.find(d => d.id === id);
  }, [id]);

  const [candidates, setCandidates] = useState<DepartmentCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Filters State
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  
  // Custom Filter Popover state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState('');
  const [tempSourceFilter, setTempSourceFilter] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);

  // Sorting state
  const [sortField, setSortField] = useState<'candidateName' | 'workExperience' | 'status' | 'source' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Selection state for bulk actions
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // Bulk action processing state
  const [bulkProcessing, setBulkProcessing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  // Selected candidate details modal state
  const [selectedCandidate, setSelectedCandidate] = useState<DepartmentCandidate | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Single action loading states (needed for modal actions)
  const [sendingLetterEmail, setSendingLetterEmail] = useState<string | null>(null);
  const [sendingRejectionEmail, setSendingRejectionEmail] = useState<string | null>(null);
  const [sendingInterviewEmail, setSendingInterviewEmail] = useState<string | null>(null);

  // Controlled select state for bulk update
  const [bulkStatusValue, setBulkStatusValue] = useState("");

  // Render dynamic action button
  const renderActionButton = (candidate: DepartmentCandidate) => {
    const isSendingLetter = sendingLetterEmail === candidate.email;
    const isSendingRejection = sendingRejectionEmail === candidate.email;
    const isSendingInterview = sendingInterviewEmail === candidate.email;
    const emailStatus = (candidate as any).emailStatus;

    if (
      emailStatus === 'Sent' ||
      emailStatus === 'Joining Letter Sent' ||
      emailStatus === 'Rejection Email Sent' ||
      emailStatus === 'Interview Scheduled' ||
      emailStatus === 'Reminder Sent'
    ) {
      return (
        <Button variant="outline" size="sm" disabled className="opacity-60 cursor-not-allowed">
          <Check className="w-3.5 h-3.5 mr-1 inline" />
          Email Sent
        </Button>
      );
    }

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

    if (candidate.status === 'Scheduled') {
      return (
        <Button
          variant="primary"
          size="sm"
          isLoading={isSendingInterview}
          onClick={() => handleSendInterviewEmail(candidate.email, candidate.candidateName)}
          icon={<Send className="w-3.5 h-3.5" />}
          className="active:scale-[0.95] bg-purple-600 hover:bg-purple-700 border-purple-600 hover:border-purple-700 text-white"
        >
          Send Interview
        </Button>
      );
    }

    if (candidate.status === 'Rejected') {
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

    return (
      <Button variant="outline" size="sm" disabled className="opacity-50 cursor-not-allowed">
        <Clock className="w-3.5 h-3.5 mr-1 inline" />
        In Pipeline
      </Button>
    );
  };

  const fetchCandidatesData = async (isSilent = false) => {
    if (!department) return;
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setErrorMsg(null);

      const data = await getDepartmentCandidates(department.sheetName);
      setCandidates(data);
      setSelectedEmails(new Set()); // Reset selection on reload
    } catch (err: any) {
      console.error(`Failed to load ${department.name} candidates:`, err);
      setErrorMsg('Unable to connect to Google Sheets');
      showToast('Unable to connect to Google Sheets', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCandidatesData();
  }, [id]);

  // Monitor click-outside to auto close filter popover
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

  // Filter & Sort candidates list
  const filteredCandidates = useMemo(() => {
    let list = candidates.filter((candidate) => {
      const nameMatch = candidate.candidateName ? candidate.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const emailMatch = candidate.email ? candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const collegeMatch = candidate.college ? candidate.college.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const ugMatch = candidate.ug ? candidate.ug.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const pgMatch = candidate.pg ? candidate.pg.toLowerCase().includes(searchQuery.toLowerCase()) : false;
      const matchesSearch = nameMatch || emailMatch || collegeMatch || ugMatch || pgMatch;

      const matchesStatus = statusFilter === '' || candidate.status === statusFilter;
      const matchesSource = sourceFilter === '' || candidate.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });

    if (sortField) {
      list.sort((a, b) => {
        let valA = (a[sortField] || '').toString().toLowerCase();
        let valB = (b[sortField] || '').toString().toLowerCase();

        // Handle numeric experience comparison if needed
        if (sortField === 'workExperience') {
          const numA = parseInt(valA.replace(/\D/g, '')) || 0;
          const numB = parseInt(valB.replace(/\D/g, '')) || 0;
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      });
    }

    return list;
  }, [candidates, searchQuery, statusFilter, sourceFilter, sortField, sortDirection]);

  // Statistics calculations
  const totalCandidates = candidates.length;
  const selectedCandidates = candidates.filter((c) => c.status === 'Selected').length;
  const rejectedCandidates = candidates.filter((c) => c.status === 'Rejected').length;
  const onHoldCandidates = candidates.filter((c) => c.status === 'On Hold').length;

  // Header stats structure
  const statsMetrics = [
    { title: 'Total Candidates', value: totalCandidates, icon: Users, iconBg: 'bg-[#EDF9E8] text-[#6FAF45] border border-[#D7F1C8]' },
    { title: 'Selected', value: selectedCandidates, icon: CheckCircle, iconBg: 'bg-[#F4FAF1] text-[#4E8B3A] border border-[#D9ECCB]' },
    { title: 'Rejected', value: rejectedCandidates, icon: XCircle, iconBg: 'bg-[#FFF5F5] text-[#C92A2A] border border-[#FFC9C9]' },
    { title: 'On Hold', value: onHoldCandidates, icon: Clock, iconBg: 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]' }
  ];

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allEmails = filteredCandidates.map(c => c.email);
      setSelectedEmails(new Set(allEmails));
    } else {
      setSelectedEmails(new Set());
    }
  };

  const handleSelectRow = (email: string) => {
    const updated = new Set(selectedEmails);
    if (updated.has(email)) {
      updated.delete(email);
    } else {
      updated.add(email);
    }
    setSelectedEmails(updated);
  };

  // Bulk status update action
  const handleBulkStatusUpdate = async (status: string) => {
    setBulkProcessing(true);
    let successCount = 0;
    const targets = Array.from(selectedEmails);

    for (let i = 0; i < targets.length; i++) {
      const email = targets[i];
      setProgressMsg(`Updating status ${i + 1}/${targets.length} to "${status}"...`);
      try {
        const res = await updateCandidateStatus(email, status);
        if (res.success) {
          successCount++;
        }
      } catch (err) {
        console.error(err);
      }
    }

    showToast(`Successfully updated status for ${successCount}/${targets.length} candidates.`, 'success');
    setBulkProcessing(false);
    setProgressMsg(null);
    setSelectedEmails(new Set());
    fetchCandidatesData(true);
    window.dispatchEvent(new Event('candidate-updated'));
  };

  // Bulk: Send Joining Letters
  const handleBulkSendLetters = async () => {
    const targets = candidates.filter(c => selectedEmails.has(c.email) && c.status === 'Selected');
    if (targets.length === 0) {
      showToast('No Selected candidates were found in your selection', 'info');
      return;
    }

    setBulkProcessing(true);
    let successCount = 0;
    
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      setProgressMsg(`Sending letter ${i + 1}/${targets.length} to ${target.candidateName}...`);
      try {
        const masterList = await fetch('/api/candidates').then(res => res.json());
        if (masterList.success) {
          const index = masterList.candidates.findIndex((c: any) => c.email === target.email);
          if (index !== -1) {
            const rowNumber = index + 2;
            const res = await sendJoiningLetter(rowNumber);
            if (res.success) {
              successCount++;
            }
          }
        }
      } catch (err) {
        console.error(`Error sending joining letter for ${target.email}:`, err);
      }
    }

    showToast(`Successfully dispatched joining letters to ${successCount}/${targets.length} candidates.`, 'success');
    setBulkProcessing(false);
    setProgressMsg(null);
    fetchCandidatesData(true);
  };

  const handleBulkSendRejections = async () => {
    const targets = candidates.filter(c => selectedEmails.has(c.email) && c.status === 'Rejected');
    if (targets.length === 0) {
      showToast('No Rejected candidates were found in your selection', 'info');
      return;
    }

    setBulkProcessing(true);
    let successCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      setProgressMsg(`Sending rejection email ${i + 1}/${targets.length} to ${target.candidateName}...`);
      try {
        const res = await sendRejectionEmail(target.email);
        if (res.success) {
          successCount++;
        }
      } catch (err) {
        console.error(`Error sending rejection email for ${target.email}:`, err);
      }
    }

    showToast(`Successfully sent rejection emails to ${successCount}/${targets.length} candidates.`, 'success');
    setBulkProcessing(false);
    setProgressMsg(null);
    fetchCandidatesData(true);
  };

  // Send Joining Letter handler (single candidate)
  const handleSendJoiningLetter = async (email: string, name: string) => {
    try {
      setSendingLetterEmail(email);
      showToast(`Generating and sending joining letter for ${name}...`, 'info');

      // Fetch candidates list to get the row number of this candidate
      const masterList = await fetch('/api/candidates').then(res => res.json());
      if (!masterList.success) throw new Error(masterList.message || 'Failed to fetch candidate row');
      const index = masterList.candidates.findIndex((c: any) => c.email === email);
      if (index === -1) throw new Error('Candidate not found in Candidates list');
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

  // Send Rejection Email handler (single candidate)
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

  // Send Interview Email handler (single candidate)
  const handleSendInterviewEmail = async (email: string, name: string) => {
    try {
      setSendingInterviewEmail(email);
      showToast(`Scheduling and sending interview invitation to ${name}...`, 'info');

      const response = await sendInterviewEmail(email);

      if (response.success) {
        showToast('Interview Invitation Sent Successfully', 'success');
        await fetchCandidatesData(true);
        window.dispatchEvent(new Event('candidate-updated'));
      } else {
        showToast(response.message || 'Failed To Send Interview Invitation', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed To Send Interview Invitation', 'error');
    } finally {
      setSendingInterviewEmail(null);
    }
  };

  // Helper sorting headers render
  const renderSortHeader = (label: string, field: 'candidateName' | 'workExperience' | 'status' | 'source') => {
    const isSorted = sortField === field;
    return (
      <button
        onClick={() => {
          if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
          } else {
            setSortField(field);
            setSortDirection('asc');
          }
        }}
        className="flex items-center gap-1 hover:text-brand transition-colors text-left uppercase text-xs font-bold text-gray-500 font-jakarta select-none"
      >
        <span>{label}</span>
        {isSorted ? (
          sortDirection === 'asc' ? '▲' : '▼'
        ) : (
          <span className="opacity-30">↕</span>
        )}
      </button>
    );
  };

  if (!department) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl flex items-start gap-3 shadow-sm text-sm">
        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
        <div>
          <h4 className="font-bold mb-1">Department Not Found</h4>
          <p>The department you are looking for does not exist in the portal settings.</p>
          <Link to="/dashboard" className="text-brand hover:underline font-bold mt-2 inline-block">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Navigation Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 select-none">
        <Link to="/dashboard" className="hover:text-brand transition-colors">Dashboard</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-600">{department.name}</span>
      </div>

      {/* Statistics Header Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-brand-border p-6 rounded-2xl shadow-sm h-28 animate-pulse flex flex-col justify-between" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsMetrics.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-white border border-brand-border p-5 rounded-2xl shadow-sm flex items-center justify-between"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-jakarta block">
                    {card.title}
                  </span>
                  <h3 className="text-2xl font-extrabold text-brand-text font-jakarta">
                    {card.value}
                  </h3>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk actions and search toolbars */}
      <div className="bg-white border border-brand-border p-5 rounded-3xl shadow-sm flex flex-col xl:flex-row items-center justify-between gap-5">
        {/* Search */}
        <div className="relative w-full xl:w-80 shrink-0">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, college, degree..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm pl-10 pr-4 py-2.5 bg-[#EDF9E8]/15 border border-brand-border rounded-2xl focus:border-[#6FAF45]/40 text-brand-text placeholder-gray-400 font-medium"
          />
        </div>

        {/* Filters and Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
          {/* Custom Filters Popover */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => {
                setIsFilterOpen(!isFilterOpen);
                if (!isFilterOpen) {
                  setTempStatusFilter(statusFilter);
                  setTempSourceFilter(sourceFilter);
                }
              }}
              className={`flex items-center gap-2.5 px-4.5 py-2.5 border rounded-2xl text-sm font-semibold transition-all duration-200 select-none active:scale-[0.98] ${
                isFilterOpen || statusFilter || sourceFilter
                  ? 'bg-[#EDF9E8] border-[#A8D672]/50 text-[#1B4332] shadow-sm font-bold'
                  : 'bg-white border-brand-border text-gray-600 hover:bg-[#EDF9E8]/35'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {(statusFilter || sourceFilter) && (
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
                  className="absolute right-0 mt-3 w-64 bg-white border border-brand-border rounded-3xl shadow-[0_20px_48px_rgba(168,214,114,0.15)] p-5 z-30 space-y-4 max-h-[400px] overflow-y-auto"
                >
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-jakarta">
                      Candidate Status
                    </span>
                    <div className="grid grid-cols-1 gap-0.5">
                      {[
                        { label: 'All Statuses', value: '', dot: null },
                        { label: 'Submitted', value: 'Submitted', dot: 'bg-gray-400' },
                        { label: 'Shortlisted', value: 'Shortlisted', dot: 'bg-sky-400' },
                        { label: 'Scheduled', value: 'Scheduled', dot: 'bg-purple-400' },
                        { label: 'Interviewing', value: 'Interviewing', dot: 'bg-sky-400' },
                        { label: 'On Hold', value: 'On Hold', dot: 'bg-[#D97706]' },
                        { label: 'Selected', value: 'Selected', dot: 'bg-[#6FAF45]' },
                        { label: 'Rejected', value: 'Rejected', dot: 'bg-[#C92A2A]' },
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

                  {/* Source Filter */}
                  <div className="space-y-2 border-t border-brand-border/60 pt-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-jakarta">
                      Candidate Source
                    </span>
                    <div className="grid grid-cols-1 gap-0.5">
                      {[
                        { label: 'All Sources', value: '' },
                        { label: 'LinkedIn', value: 'LinkedIn' },
                        { label: 'Career Page', value: 'Career Page' },
                        { label: 'Referral', value: 'Referral' },
                        { label: 'Website', value: 'Website' },
                        { label: 'Manual Entry', value: 'Manual Entry' },
                        { label: 'Other', value: 'Other' },
                      ].map((src) => (
                        <button
                          key={src.label}
                          onClick={() => setTempSourceFilter(src.value)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold text-left transition-colors ${
                            tempSourceFilter === src.value
                              ? 'bg-[#EDF9E8] text-[#1B4332]'
                              : 'text-gray-600 hover:bg-[#EDF9E8]/20'
                          }`}
                        >
                          <span>{src.label}</span>
                          {tempSourceFilter === src.value && <Check className="w-3.5 h-3.5 text-[#6FAF45]" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filter actions */}
                  <div className="flex gap-2 pt-2 border-t border-brand-border/60">
                    <button
                      onClick={() => {
                        setTempStatusFilter('');
                        setTempSourceFilter('');
                        setStatusFilter('');
                        setSourceFilter('');
                        setIsFilterOpen(false);
                        showToast('Filters reset successfully', 'info');
                      }}
                      className="flex-1 px-3 py-2 text-xs font-bold text-gray-500 border border-brand-border bg-white rounded-xl hover:bg-[#EDF9E8]/30 transition-all select-none active:scale-[0.98]"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => {
                        setStatusFilter(tempStatusFilter);
                        setSourceFilter(tempSourceFilter);
                        setIsFilterOpen(false);
                        showToast('Filters applied successfully', 'success');
                      }}
                      className="flex-1 px-3 py-2 text-xs font-bold text-white bg-[#6FAF45] border border-[#6FAF45]/10 rounded-xl hover:bg-[#5f953a] transition-all select-none active:scale-[0.98]"
                    >
                      Apply
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button
            onClick={() => handleBulkSendRejections()}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-2xl border transition-all active:scale-[0.98] ${
              selectedEmails.size > 0
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100/70'
                : 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed opacity-50'
            }`}
            disabled={selectedEmails.size === 0 || bulkProcessing}
          >
            <XCircle className="w-3.5 h-3.5" />
            Send Rejections ({selectedEmails.size})
          </button>

          <button
            onClick={handleBulkSendLetters}
            className={`inline-flex items-center gap-2 px-4.5 py-2.5 text-xs font-bold rounded-2xl border transition-all active:scale-[0.98] ${
              selectedEmails.size > 0
                ? 'bg-[#6FAF45] text-white border-[#6FAF45] hover:bg-[#5f953a] shadow-sm'
                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
            }`}
            disabled={selectedEmails.size === 0 || bulkProcessing}
          >
            <Send className="w-3.5 h-3.5" />
            Send Letters ({selectedEmails.size})
          </button>

          {/* Bulk status update inside department */}
          <select
            value={bulkStatusValue}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                handleBulkStatusUpdate(val);
              }
              setBulkStatusValue("");
            }}
            className={`text-xs font-bold py-2.5 pl-3.5 pr-8 rounded-2xl border transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%234B5563%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[right_8px_center] bg-no-repeat bg-[length:14px_14px] ${
              selectedEmails.size > 0 
                ? 'border-brand text-brand hover:bg-[#EDF9E8]/30' 
                : 'border-gray-200 text-gray-400 bg-gray-50 opacity-60 cursor-not-allowed'
            }`}
            disabled={selectedEmails.size === 0 || bulkProcessing}
          >
            <option value="" disabled hidden>Bulk Status Update...</option>
            {['Submitted', 'Shortlisted', 'Scheduled', 'On Hold', 'Selected', 'Rejected'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Sync Trigger Button */}
          <button
            onClick={() => fetchCandidatesData(true)}
            disabled={refreshing || bulkProcessing}
            className="p-2.5 border border-brand-border rounded-2xl bg-white hover:bg-[#EDF9E8]/40 text-gray-500 hover:text-[#6FAF45] transition-all shrink-0 disabled:opacity-40 active:scale-[0.95] flex items-center justify-center"
            title="Refresh candidate data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Progress alert during sequential bulk action */}
      {bulkProcessing && progressMsg && (
        <div className="bg-[#EDF9E8] border border-[#A8D672]/30 text-[#1B4332] p-4 rounded-xl flex items-center gap-3 shadow-sm text-xs font-semibold animate-pulse">
          <RefreshCw className="w-4 h-4 text-[#6FAF45] animate-spin" />
          <span>{progressMsg}</span>
        </div>
      )}

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

      {/* Candidates table */}
      <div className="bg-white border border-brand-border rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-bg/40 border-b border-brand-border">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta w-10">
                    <input type="checkbox" disabled />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Candidate Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Phone</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Experience</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">College</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Location</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Links</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right font-jakarta">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {[...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4.5"><div className="w-4 h-4 bg-gray-200 rounded" /></td>
                    <td className="px-6 py-4.5"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-6 py-4.5"><div className="h-3 bg-gray-200 rounded w-36" /></td>
                    <td className="px-6 py-4.5"><div className="h-3 bg-gray-200 rounded w-24" /></td>
                    <td className="px-6 py-4.5"><div className="h-3 bg-gray-200 rounded w-16" /></td>
                    <td className="px-6 py-4.5"><div className="h-3 bg-gray-200 rounded w-28" /></td>
                    <td className="px-6 py-4.5"><div className="h-3 bg-gray-200 rounded w-20" /></td>
                    <td className="px-6 py-4.5"><div className="h-3 bg-gray-200 rounded w-14" /></td>
                    <td className="px-6 py-4.5"><div className="h-5 bg-gray-200 rounded-full w-20" /></td>
                    <td className="px-6 py-4.5 text-right flex justify-end gap-2"><div className="h-8 bg-gray-200 rounded-lg w-14" /><div className="h-8 bg-gray-200 rounded-lg w-24" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-20 animate-fade-in animate-transition">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-brand-text font-jakarta">No Candidates Found</p>
            <p className="text-xs text-gray-400 mt-1">Try updating your filters or search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-brand-bg/40 border-b border-brand-border">
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={filteredCandidates.length > 0 && selectedEmails.size === filteredCandidates.length}
                      className="rounded border-gray-300 text-[#6FAF45] focus:ring-[#6FAF45] w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4.5 text-left">{renderSortHeader('Candidate Name', 'candidateName')}</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Email</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Phone</th>
                  <th className="px-6 py-4.5 text-left">{renderSortHeader('Experience', 'workExperience')}</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">UG</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">PG</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">College</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta">Links</th>
                  <th className="px-6 py-4.5 text-left">{renderSortHeader('Status', 'status')}</th>
                  <th className="px-6 py-4.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right font-jakarta">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filteredCandidates.map((candidate, idx) => (
                  <tr 
                    key={`${candidate.email}-${idx}`} 
                    className={`hover:bg-brand-light/10 transition-colors duration-150 ${
                      selectedEmails.has(candidate.email) ? 'bg-[#EDF9E8]/20' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedEmails.has(candidate.email)}
                        onChange={() => handleSelectRow(candidate.email)}
                        className="rounded border-gray-300 text-[#6FAF45] focus:ring-[#6FAF45] w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-brand-text font-jakarta max-w-[140px] truncate overflow-hidden text-ellipsis whitespace-nowrap" title={candidate.candidateName}>
                      {candidate.candidateName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 max-w-[180px] truncate overflow-hidden text-ellipsis whitespace-nowrap" title={candidate.email}>
                      {candidate.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 max-w-[120px] truncate overflow-hidden text-ellipsis whitespace-nowrap" title={candidate.phoneNumber || 'N/A'}>
                      {candidate.phoneNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-gray-600 max-w-[80px] truncate overflow-hidden text-ellipsis whitespace-nowrap" title={candidate.workExperience ? `${candidate.workExperience} months` : 'N/A'}>
                      {candidate.workExperience ? `${candidate.workExperience} months` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 max-w-[120px] truncate overflow-hidden text-ellipsis whitespace-nowrap" title={candidate.ug || 'N/A'}>
                      {candidate.ug || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 max-w-[120px] truncate overflow-hidden text-ellipsis whitespace-nowrap" title={candidate.pg || 'N/A'}>
                      {candidate.pg || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 max-w-[160px] truncate overflow-hidden text-ellipsis whitespace-nowrap" title={candidate.college || 'N/A'}>
                      {candidate.college || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        {candidate.linkedin ? (
                          <a
                            href={candidate.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-[#EDF9E8]/40 hover:bg-[#EDF9E8] text-brand transition-colors"
                            title="LinkedIn Profile"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : null}
                        {candidate.github ? (
                          <a
                            href={candidate.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                            title="GitHub Profile"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : null}
                        {!candidate.linkedin && !candidate.github && '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={SHEET_STATUS_OPTIONS.includes(candidate.status as any) ? candidate.status : "Interviewing"}
                        onChange={e => {
                          const newStatus = e.target.value;
                          console.log('DepartmentDetails.tsx onChange: Selected status =', newStatus, 'for candidate =', candidate.email);
                          updateCandidateStatus(candidate.email, newStatus)
                            .then((res) => {
                              console.log('DepartmentDetails.tsx onChange: updateCandidateStatus response =', res);
                              if (res && res.success) {
                                const updatedCandidates = candidates.map(c =>
                                  c.email === candidate.email ? { ...c, status: newStatus } : c
                                );
                                setCandidates(updatedCandidates);
                                showToast(`Status updated to ${newStatus}`, 'success');
                                fetchCandidatesData(true);
                                window.dispatchEvent(new Event('candidate-updated'));
                              } else {
                                showToast(res?.message || 'Failed to update status', 'error');
                                fetchCandidatesData(true);
                              }
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
                      </select>
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
        onSendInterview={async (email) => {
          setIsDetailsOpen(false);
          if (selectedCandidate) {
            await handleSendInterviewEmail(email, selectedCandidate.candidateName);
          }
        }}
      />
    </div>
  );
};

export default DepartmentDetails;
