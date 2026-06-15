import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import type { Candidate } from '../services/googleAppsScript';
import { Mail, Briefcase, Calendar, CheckSquare, Send, XCircle, Clock, Check, Compass, Eye, FileText, ExternalLink } from 'lucide-react';

interface CandidateDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  onSendLetter: (email: string) => void;
  onSendRejection: (email: string) => void;
}

// Returns badge classes for each candidate status
const getStatusBadgeClass = (status: string) => {
  switch (status) {
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

const getSourceBadgeClass = (source?: string) => {
  switch (source) {
    case 'LinkedIn':
      return 'bg-sky-50 text-sky-700 border-sky-100';
    case 'Career Page':
      return 'bg-teal-50 text-teal-700 border-teal-100';
    case 'Referral':
      return 'bg-purple-50 text-purple-700 border-purple-100';
    case 'Website':
      return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'Manual Entry':
      return 'bg-orange-50 text-orange-700 border-orange-100';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-100';
  }
};

const CandidateDetailsModal: React.FC<CandidateDetailsModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onSendLetter,
  onSendRejection
}) => {
  const [showResume, setShowResume] = React.useState(false);

  React.useEffect(() => {
    setShowResume(false);
  }, [candidate]);

  if (!candidate) return null;

  // Extract initials for the profile avatar
  const initials = candidate.candidateName
    ? candidate.candidateName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'C';

  const emailAlreadySent = candidate.emailStatus === 'Sent';

  const renderActionButton = () => {
    if (emailAlreadySent) {
      return (
        <button
          disabled
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-2xl border border-[#D7F1C8] bg-[#EDF9E8] text-[#2D6A2D] opacity-80 cursor-not-allowed"
        >
          <Check className="w-4 h-4" />
          Email Sent
        </button>
      );
    }

    if (candidate.status === 'Selected') {
      return (
        <Button
          variant="primary"
          onClick={() => onSendLetter(candidate.email)}
          icon={<Send className="w-4 h-4" />}
          className="px-6 active:scale-[0.98]"
        >
          Send Joining Letter
        </Button>
      );
    }

    if (candidate.status === 'Rejected') {
      return (
        <button
          onClick={() => onSendRejection(candidate.email)}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-2xl border border-[#FFC9C9] bg-[#FFF5F5] text-[#C92A2A] hover:bg-[#FFE5E5] transition-all duration-200 active:scale-[0.98]"
        >
          <XCircle className="w-4 h-4" />
          Send Rejection Email
        </button>
      );
    }

    if (candidate.status === 'Interviewing') {
      return (
        <button
          disabled
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8] opacity-70 cursor-not-allowed"
        >
          <Clock className="w-4 h-4" />
          In Process
        </button>
      );
    }

    if (candidate.status === 'On Hold') {
      return (
        <button
          disabled
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-2xl border border-[#FDE68A] bg-[#FFF7ED] text-[#B45309] opacity-70 cursor-not-allowed"
        >
          <Clock className="w-4 h-4" />
          Waiting
        </button>
      );
    }

    // Fallback
    return (
      <Button
        variant="primary"
        onClick={() => onSendLetter(candidate.email)}
        icon={<Send className="w-4 h-4" />}
        className="px-6 active:scale-[0.98]"
      >
        Send Email
      </Button>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Candidate Profile Details" size="lg">
      <div className="space-y-6">
        {/* Profile Header Card */}
        <div className="flex items-center gap-4 p-4 bg-brand-bg/40 border border-brand-border/60 rounded-xl">
          <div className="w-14 h-14 bg-brand/10 border border-brand/20 text-brand flex items-center justify-center font-bold text-lg font-poppins rounded-xl shadow-sm shrink-0 select-none">
            {initials}
          </div>
          <div>
            <h4 className="text-base font-bold text-brand-text font-poppins leading-snug">
              {candidate.candidateName}
            </h4>
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 font-semibold mt-1">
              <Briefcase className="w-3.5 h-3.5 text-brand/70" />
              {candidate.role}
            </span>
          </div>
        </div>

        {/* Detailed Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email Card */}
          <div className="bg-white border border-brand-border/60 rounded-xl p-4 flex gap-3 shadow-sm hover:border-brand-light/35 transition-colors duration-250">
            <Mail className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Email Address</span>
              <a
                href={`mailto:${candidate.email}`}
                className="text-sm font-semibold text-brand hover:underline break-all"
              >
                {candidate.email}
              </a>
            </div>
          </div>

          {/* Joining Date Card */}
          <div className="bg-white border border-brand-border/60 rounded-xl p-4 flex gap-3 shadow-sm hover:border-brand-light/35 transition-colors duration-250">
            <Calendar className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Date of Joining</span>
              <span className="text-sm font-semibold text-brand-text">
                {candidate.joiningDate ? new Date(candidate.joiningDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : 'N/A'}
              </span>
            </div>
          </div>

          {/* Selection Status Card */}
          <div className="bg-white border border-brand-border/60 rounded-xl p-4 flex gap-3 shadow-sm hover:border-brand-light/35 transition-colors duration-250">
            <CheckSquare className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Candidate Status</span>
              <span className={`inline-flex text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase mt-1 border ${getStatusBadgeClass(candidate.status)}`}>
                {candidate.status}
              </span>
            </div>
          </div>

          {/* Email Status Card */}
          <div className="bg-white border border-brand-border/60 rounded-xl p-4 flex gap-3 shadow-sm hover:border-brand-light/35 transition-colors duration-250">
            <Send className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Letter Dispatch</span>
              <span className={`inline-flex text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase mt-1 border ${
                candidate.emailStatus === 'Sent'
                  ? 'bg-green-50 text-brand border-green-100'
                  : 'bg-amber-50 text-amber-700 border-amber-100'
              }`}>
                {candidate.emailStatus}
              </span>
            </div>
          </div>

          {/* Candidate Source Card */}
          <div className="bg-white border border-brand-border/60 rounded-xl p-4 flex gap-3 shadow-sm hover:border-brand-light/35 transition-colors duration-250">
            <Compass className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Candidate Source</span>
              <span className={`inline-flex text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase mt-1 border ${getSourceBadgeClass(candidate.source)}`}>
                {candidate.source || 'Website'}
              </span>
            </div>
          </div>

          {/* Candidate Resume Card */}
          {candidate.resumeFileId && (
            <div className="bg-white border border-brand-border/60 rounded-xl p-4 flex gap-3 shadow-sm hover:border-brand-light/35 transition-colors duration-250 md:col-span-2">
              <FileText className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div className="space-y-2 w-full">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Candidate Resume</span>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => setShowResume(!showResume)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-brand-border bg-white text-gray-700 hover:bg-[#EDF9E8]/40 hover:text-brand transition-all duration-200 active:scale-[0.98]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {showResume ? 'Hide Resume Preview' : 'View Resume'}
                  </button>
                  <a
                    href={`https://drive.google.com/file/d/${candidate.resumeFileId}/view?usp=drivesdk`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-brand-border bg-white text-gray-700 hover:bg-[#EDF9E8]/40 hover:text-brand transition-all duration-200 active:scale-[0.98]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Drive File
                  </a>
                </div>
                {showResume && (
                  <div className="mt-3 border border-brand-border rounded-xl overflow-hidden bg-gray-50 h-[450px] w-full animate-fade-in">
                    <iframe
                      src={`https://drive.google.com/file/d/${candidate.resumeFileId}/preview`}
                      className="w-full h-full border-0"
                      title="Resume Viewer"
                      allow="autoplay"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-5 border-t border-brand-border flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="px-5 active:scale-[0.98]">
            Cancel
          </Button>
          {renderActionButton()}
        </div>
      </div>
    </Modal>
  );
};

export default CandidateDetailsModal;
