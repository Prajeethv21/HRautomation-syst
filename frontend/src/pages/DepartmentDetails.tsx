import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  getDepartmentCandidates, sendJoiningLetter, sendRejectionEmail, sendInterviewEmail,
  updateCandidateStatus, triggerResumeProcessing, uploadResumes, type DepartmentCandidate 
} from '../services/googleAppsScript';
import { DEPARTMENTS } from '../config/departments';
import { 
  Users, CheckCircle, XCircle, Clock, Send, 
  RefreshCw, Search, ExternalLink, ChevronRight, AlertCircle, Filter, Check, Eye,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import CandidateDetailsModal from '../components/CandidateDetailsModal';
import Modal from '../components/ui/Modal';

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'Submitted':
      return 'bg-white text-gray-800 border-gray-200';
    case 'Shortlisted':
      return 'bg-white text-gray-800 border-brand/50';
    case 'Scheduled':
      return 'bg-white text-gray-800 border-amber-300';
    case 'Interviewing':
      return 'bg-white text-gray-800 border-brand/50';
    case 'Selected':
      return 'bg-white text-gray-800 border-green-400';
    case 'Rejected':
      return 'bg-white text-gray-800 border-red-300';
    case 'On Hold':
      return 'bg-white text-gray-800 border-amber-300';
    default:
      return 'bg-white text-gray-800 border-gray-200';
  }
};


const SHEET_STATUS_OPTIONS = [
  'Submitted',
  'Shortlisted',
  'Scheduled',
  'Interviewing',
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
  const [sortField, setSortField] = useState<'candidateName' | 'status' | 'source' | null>(null);
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

  // Slow-load hint: shows after 3s to tell user Google Sheets can be slow on first load
  const [showSlowHint, setShowSlowHint] = useState(false);

  // Controlled select state for bulk update
  const [bulkStatusValue, setBulkStatusValue] = useState("");

  // Upload resumes state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileProgresses, setFileProgresses] = useState<{ [key: string]: number }>({});
  const [fileStatuses, setFileStatuses] = useState<{ [key: string]: 'pending' | 'uploading' | 'success' | 'error' }>({});
  const [selectedSource, setSelectedSource] = useState<string>('Website');

  const handleFileSelection = (files: File[]) => {
    const allowedExtensions = ['pdf', 'doc', 'docx'];
    const filteredFiles = files.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      return allowedExtensions.includes(ext);
    });

    if (filteredFiles.length !== files.length) {
      showToast('Some files were skipped. Only PDF, DOC, and DOCX files are allowed.', 'info');
    }

    setUploadFiles(prev => {
      const existingNames = prev.map(f => f.name);
      const newFiles = filteredFiles.filter(f => !existingNames.includes(f.name));
      return [...prev, ...newFiles];
    });
  };

  const handleStartUpload = async () => {
    if (uploadFiles.length === 0 || !department) return;
    setUploading(true);
    showToast('Uploading resumes to Google Drive...', 'info');

    const initialStatuses: { [key: string]: 'pending' | 'uploading' | 'success' | 'error' } = {};
    const initialProgresses: { [key: string]: number } = {};
    uploadFiles.forEach(f => {
      initialStatuses[f.name] = 'pending';
      initialProgresses[f.name] = 0;
    });
    setFileStatuses(initialStatuses);
    setFileProgresses(initialProgresses);

    let failedCount = 0;
    let successCount = 0;

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      setFileStatuses(prev => ({ ...prev, [file.name]: 'uploading' }));
      setFileProgresses(prev => ({ ...prev, [file.name]: 30 }));

      try {
        setFileProgresses(prev => ({ ...prev, [file.name]: 60 }));
        const response = await uploadResumes([file], department.id, selectedSource);
        
        if (response.success) {
          successCount++;
          setFileStatuses(prev => ({ ...prev, [file.name]: 'success' }));
          setFileProgresses(prev => ({ ...prev, [file.name]: 100 }));
        } else {
          failedCount++;
          setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
        }
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
        failedCount++;
        setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
      }
    }

    if (failedCount === 0) {
      showToast(`Successfully uploaded ${successCount} resume(s). Parsing details...`, 'success');
      try {
        setBulkProcessing(true);
        setProgressMsg('Triggering existing resume parser to process new uploads...');
        const parseRes = await triggerResumeProcessing();
        if (parseRes.success) {
          showToast('Resume parsing completed. Table updated.', 'success');
        } else {
          showToast('Automatic parsing failed, but files are saved in Drive. Please refresh manually.', 'info');
        }
      } catch (err) {
        console.error(err);
        showToast('Resumes uploaded, but details parsing failed. Check Drive.', 'info');
      } finally {
        setBulkProcessing(false);
        setProgressMsg(null);
        fetchCandidatesData(true);
        window.dispatchEvent(new Event('candidate-updated'));
        setIsUploadModalOpen(false);
        setUploadFiles([]);
      }
    } else {
      showToast(`Upload completed: ${successCount} succeeded, ${failedCount} failed.`, 'info');
      if (successCount > 0) {
        try {
          setBulkProcessing(true);
          setProgressMsg('Triggering resume parser for successful uploads...');
          await triggerResumeProcessing();
        } catch (_) {}
        setBulkProcessing(false);
        setProgressMsg(null);
        fetchCandidatesData(true);
        window.dispatchEvent(new Event('candidate-updated'));
      }
    }
    setUploading(false);
  };

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
          className="active:scale-[0.95]"
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
    let slowHintTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      if (!isSilent) {
        setLoading(true);
        setShowSlowHint(false);
        // Show slow-load hint after 3 seconds
        slowHintTimer = setTimeout(() => setShowSlowHint(true), 3000);
      } else {
        setRefreshing(true);
      }
      setErrorMsg(null);

      const data = await getDepartmentCandidates(department.sheetName);
      setCandidates(data);
      setSelectedEmails(new Set()); // Reset selection on reload
    } catch (err: any) {
      console.error(`Failed to load ${department.name} candidates:`, err);
      setErrorMsg('Unable to connect to Google Sheets');
      showToast('Unable to connect to Google Sheets', 'error');
    } finally {
      if (slowHintTimer) clearTimeout(slowHintTimer);
      setShowSlowHint(false);
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
    { title: 'Total Candidates', value: totalCandidates, icon: Users },
    { title: 'Selected', value: selectedCandidates, icon: CheckCircle },
    { title: 'Rejected', value: rejectedCandidates, icon: XCircle },
    { title: 'On Hold', value: onHoldCandidates, icon: Clock }
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
        const res = await sendJoiningLetter(target.email);
        if (res.success) {
          successCount++;
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

      const response = await sendJoiningLetter(email);

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
  const renderSortHeader = (label: string, field: 'candidateName' | 'status' | 'source') => {
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
        {department.id === 'sustainability' && (
          <img src="/favicon.png" className="w-5 h-5 object-contain shrink-0" alt="Leaf Logo" />
        )}
        <span className="text-gray-600">{department.name}</span>
      </div>

      {/* Statistics Header Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] p-6 rounded-2xl shadow-sm h-[108px] animate-pulse flex flex-col justify-between" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsMetrics.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="bg-white border border-[#E5E7EB] p-6 rounded-2xl shadow-sm flex items-center justify-between h-[108px] hover:border-brand hover:shadow-sm transition-all duration-200"
              >
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-jakarta block">
                    {card.title}
                  </span>
                  <h3 className="text-2xl font-bold text-[#111111] font-jakarta">
                    {card.value}
                  </h3>
                </div>
                <Icon className="w-6 h-6 text-brand shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk actions and search toolbars */}
      <div className="bg-white border border-[#E5E7EB] px-6 py-6 rounded-3xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Search */}
        <div className="relative w-full lg:w-80 shrink-0">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, college, degree..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 text-sm pl-10 pr-4 bg-white border border-[#E5E7EB] rounded-2xl focus:border-brand/40 text-brand-text placeholder-gray-400 font-medium"
          />
        </div>

        {/* Filters and Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-3.5 w-full lg:w-auto justify-start lg:justify-end">
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
              className={`flex items-center justify-center gap-2.5 px-4 h-10 border rounded-2xl text-sm font-semibold transition-all duration-200 select-none active:scale-[0.98] ${
                isFilterOpen || statusFilter || sourceFilter
                  ? 'bg-white border-brand text-brand shadow-sm font-bold'
                  : 'bg-white border-brand-border text-gray-600 hover:border-brand/40'
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
                        { label: 'Shortlisted', value: 'Shortlisted', dot: 'bg-[#8CC63F]' },
                        { label: 'Scheduled', value: 'Scheduled', dot: 'bg-[#E6B93B]' },
                        { label: 'Interviewing', value: 'Interviewing', dot: 'bg-[#6FAF45]' },
                        { label: 'On Hold', value: 'On Hold', dot: 'bg-[#E6B93B]' },
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
            className={`inline-flex items-center justify-center gap-2 px-5 min-w-[140px] h-10 text-xs font-bold rounded-2xl border transition-all active:scale-[0.98] ${
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
            className={`inline-flex items-center justify-center gap-2 px-5 min-w-[140px] h-10 text-xs font-bold rounded-2xl border transition-all active:scale-[0.98] ${
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
            className={`text-xs font-bold h-10 pl-3.5 pr-8 rounded-2xl border transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%234B5563%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[right_8px_center] bg-no-repeat bg-[length:14px_14px] ${
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

          {/* Upload Resumes Button */}
          <Button
            variant="primary"
            onClick={() => setIsUploadModalOpen(true)}
            disabled={refreshing || bulkProcessing || uploading}
            icon={<Upload className="w-3.5 h-3.5" />}
            className="h-10 text-xs font-bold rounded-2xl border transition-all active:scale-[0.98] px-4"
          >
            Upload Resumes
          </Button>

          {/* Sync Trigger Button */}
          <button
            onClick={() => fetchCandidatesData(true)}
            disabled={refreshing || bulkProcessing || uploading}
            className="w-10 h-10 flex items-center justify-center border border-[#E5E7EB] rounded-2xl bg-white hover:bg-[#EDF9E8]/40 text-gray-500 hover:text-[#6FAF45] transition-all shrink-0 disabled:opacity-40 active:scale-[0.95]"
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

      {/* Slow-load hint during initial fetch */}
      {loading && showSlowHint && (
        <div className="bg-[#FFF9EB] border border-amber-200 text-amber-800 p-3.5 rounded-xl flex items-center gap-3 text-xs font-semibold animate-fade-in">
          <RefreshCw className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
          <span>Connecting to Google Sheets for the first time — this usually takes 5–15 seconds. Please wait...</span>
        </div>
      )}

      {/* Integration Error Notice */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 shadow-sm text-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold font-poppins mb-0.5">Google Sheets Synchronization Failure</h4>
            <p>{errorMsg}. Please ensure your environment settings match your deployed script Web App.</p>
          </div>
          <button
            onClick={() => fetchCandidatesData()}
            className="shrink-0 px-3 py-1.5 text-xs font-bold bg-red-100 hover:bg-red-200 border border-red-200 rounded-xl transition-all active:scale-95"
          >
            Retry
          </button>
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
                    <td className="px-6 py-4"><div className="w-4 h-4 bg-gray-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-3 bg-gray-200 rounded w-36" /></td>
                    <td className="px-6 py-4"><div className="h-3 bg-gray-200 rounded w-24" /></td>
                    <td className="px-6 py-4"><div className="h-3 bg-gray-200 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-3 bg-gray-200 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-3 bg-gray-200 rounded w-20" /></td>
                    <td className="px-6 py-4"><div className="h-3 bg-gray-200 rounded w-14" /></td>
                    <td className="px-6 py-4"><div className="h-5 bg-gray-200 rounded-full w-20" /></td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2"><div className="h-8 bg-gray-200 rounded-lg w-14" /><div className="h-8 bg-gray-200 rounded-lg w-24" /></td>
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
                  <th className="pl-8 pr-4 py-4 w-10 text-left">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={filteredCandidates.length > 0 && selectedEmails.size === filteredCandidates.length}
                      className="rounded border-gray-300 text-[#6FAF45] focus:ring-[#6FAF45] w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="pl-6 pr-4 py-4 text-left">{renderSortHeader('Candidate Name', 'candidateName')}</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta text-left">Email</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta text-left">Phone</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta text-left">UG</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta text-left">PG</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta text-left">College</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider font-jakarta text-left">Links</th>
                  <th className="px-4 py-4 text-left">{renderSortHeader('Status', 'status')}</th>
                  <th className="pl-4 pr-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right font-jakarta">Actions</th>
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
                    <td className="pl-8 pr-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedEmails.has(candidate.email)}
                        onChange={() => handleSelectRow(candidate.email)}
                        className="rounded border-gray-300 text-[#6FAF45] focus:ring-[#6FAF45] w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="pl-6 pr-4 py-4 whitespace-nowrap text-sm font-bold text-brand-text font-jakarta max-w-[140px] truncate overflow-hidden text-ellipsis whitespace-nowrap" title={candidate.candidateName}>
                      {candidate.candidateName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500 max-w-[180px] truncate overflow-hidden text-ellipsis whitespace-nowrap" title={candidate.email}>
                      {candidate.email}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500 max-w-[120px] truncate overflow-hidden text-ellipsis whitespace-nowrap" title={candidate.phoneNumber || 'N/A'}>
                      {candidate.phoneNumber || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500 max-w-[120px] truncate overflow-hidden text-ellipsis whitespace-nowrap" title={candidate.ug || 'N/A'}>
                      {candidate.ug || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500 max-w-[120px] truncate overflow-hidden text-ellipsis whitespace-nowrap" title={candidate.pg || 'N/A'}>
                      {candidate.pg || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500 max-w-[160px] truncate overflow-hidden text-ellipsis whitespace-nowrap" title={candidate.college || 'N/A'}>
                      {candidate.college || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
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
                    <td className="px-4 py-4 whitespace-nowrap">
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
                    <td className="pl-4 pr-8 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex justify-end gap-3">
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

      {/* Upload Resumes Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          if (!uploading) {
            setIsUploadModalOpen(false);
            setUploadFiles([]);
            setFileProgresses({});
            setFileStatuses({});
            setSelectedSource('Website');
          }
        }}
        title={`Upload Resumes - ${department.name}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Source Selector */}
          <div className="space-y-2">
            <label htmlFor="upload-source-select" className="text-xs font-bold text-gray-500 uppercase tracking-wider block font-jakarta">
              Candidate Source
            </label>
            <select
              id="upload-source-select"
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full text-xs font-bold py-2.5 pl-3.5 pr-8 rounded-2xl border border-brand-border bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#6FAF45]/50 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%234B5563%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[right_12px_center] bg-no-repeat bg-[length:14px_14px]"
            >
              <option value="Website">Website</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Career Page">Career Page</option>
              <option value="Referral">Referral</option>
              <option value="Manual Entry">Manual Entry</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (uploading) return;
              const files = Array.from(e.dataTransfer.files);
              handleFileSelection(files);
            }}
            className="border-2 border-dashed border-[#8CC63F]/40 hover:border-[#6FAF45] bg-[#EDF9E8]/10 hover:bg-[#EDF9E8]/20 transition-all duration-200 rounded-2xl p-8 text-center cursor-pointer relative"
            onClick={() => {
              if (!uploading) {
                document.getElementById('file-input')?.click();
              }
            }}
          >
            <input
              id="file-input"
              type="file"
              multiple
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                if (e.target.files) {
                  handleFileSelection(Array.from(e.target.files));
                }
              }}
              className="hidden"
            />
            <Upload className="w-10 h-10 text-[#6FAF45] mx-auto mb-3" />
            <p className="text-sm font-bold text-brand-text font-jakarta">
              Drag & drop resumes here, or <span className="text-[#6FAF45] hover:underline">browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supports PDF, DOC, and DOCX (Max 10MB per file)
            </p>
          </div>

          {/* Files List */}
          {uploadFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-brand-border pb-2">
                <span className="text-xs font-bold text-gray-500 font-jakarta uppercase">
                  Files ({uploadFiles.length})
                </span>
                {!uploading && (
                  <button
                    onClick={() => {
                      setUploadFiles([]);
                      setFileProgresses({});
                      setFileStatuses({});
                    }}
                    className="text-xs font-semibold text-red-500 hover:text-red-700 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="max-h-[200px] overflow-y-auto space-y-2.5 pr-1">
                {uploadFiles.map((file, idx) => {
                  const status = fileStatuses[file.name] || 'pending';
                  const progress = fileProgresses[file.name] || 0;
                  return (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between p-3.5 bg-gray-50 border border-brand-border rounded-xl text-xs"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="font-bold text-brand-text truncate font-jakarta" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        
                        {/* File upload progress bar */}
                        {status === 'uploading' && (
                          <div className="w-full bg-gray-200 h-1 rounded-full mt-2 overflow-hidden">
                            <div
                              className="bg-[#6FAF45] h-full transition-all duration-200"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {status === 'pending' && (
                          <span className="text-gray-400 font-semibold">Ready</span>
                        )}
                        {status === 'uploading' && (
                          <span className="text-[#6FAF45] font-bold animate-pulse">Uploading...</span>
                        )}
                        {status === 'success' && (
                          <span className="text-[#2D6A2D] font-bold bg-[#EDF9E8] px-2 py-0.5 rounded-lg border border-[#D7F1C8]">Uploaded</span>
                        )}
                        {status === 'error' && (
                          <span className="text-[#C92A2A] font-bold bg-[#FFF5F5] px-2 py-0.5 rounded-lg border border-[#FFC9C9]">Failed</span>
                        )}
                        
                        {!uploading && (
                          <button
                            onClick={() => {
                              setUploadFiles(prev => prev.filter(f => f.name !== file.name));
                              const updatedStatuses = { ...fileStatuses };
                              delete updatedStatuses[file.name];
                              setFileStatuses(updatedStatuses);
                            }}
                            className="text-gray-400 hover:text-red-500 font-bold p-1 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action buttons inside Modal content */}
          <div className="flex items-center justify-end gap-3 border-t border-brand-border pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadFiles([]);
                setFileProgresses({});
                setFileStatuses({});
                setSelectedSource('Website');
              }}
              disabled={uploading}
              className="active:scale-[0.98]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleStartUpload}
              disabled={uploadFiles.length === 0 || uploading}
              isLoading={uploading}
              icon={<Upload className="w-3.5 h-3.5" />}
              className="active:scale-[0.98]"
            >
              {uploading ? 'Uploading...' : 'Start Upload'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DepartmentDetails;
