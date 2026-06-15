import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import type { Candidate, DepartmentCandidate } from '../services/googleAppsScript';
import { Mail, Briefcase, Calendar, CheckSquare, Send, XCircle, Clock, Check, Compass, Phone, MapPin, GraduationCap, Award } from 'lucide-react';

const Linkedin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const Github = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

interface CandidateDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | DepartmentCandidate | null;
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


  if (!candidate) return null;
  const extra = candidate as any;

  // Extract initials for the profile avatar
  const initials = candidate.candidateName
    ? candidate.candidateName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
    : 'C';

  const emailAlreadySent = extra.emailStatus === 'Sent';

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
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Candidate Profile Details" 
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="px-5 active:scale-[0.98]">
            Cancel
          </Button>
          {renderActionButton()}
        </>
      }
    >
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
              {extra.role || 'Candidate'}
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
                {extra.joiningDate ? new Date(extra.joiningDate).toLocaleDateString('en-US', {
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
              <span className={`inline-flex text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase mt-1 border ${extra.emailStatus === 'Sent'
                  ? 'bg-green-50 text-brand border-green-100'
                  : 'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                {extra.emailStatus || 'Pending'}
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

          {/* Phone Number Card */}
          {extra.phoneNumber && (
            <div className="bg-white border border-brand-border/60 rounded-xl p-4 flex gap-3 shadow-sm hover:border-brand-light/35 transition-colors duration-250">
              <Phone className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Phone Number</span>
                <span className="text-sm font-semibold text-brand-text">{extra.phoneNumber}</span>
              </div>
            </div>
          )}

          {/* College Card */}
          {extra.college && (
            <div className="bg-white border border-brand-border/60 rounded-xl p-4 flex gap-3 shadow-sm hover:border-brand-light/35 transition-colors duration-250">
              <GraduationCap className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">College / Institution</span>
                <span className="text-sm font-semibold text-brand-text">{extra.college}</span>
              </div>
            </div>
          )}

          {/* Location Card */}
          {extra.location && (
            <div className="bg-white border border-brand-border/60 rounded-xl p-4 flex gap-3 shadow-sm hover:border-brand-light/35 transition-colors duration-250">
              <MapPin className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Location</span>
                <span className="text-sm font-semibold text-brand-text">{extra.location}</span>
              </div>
            </div>
          )}

          {/* Work Experience Card */}
          {extra.workExperience !== undefined && extra.workExperience !== "" && (
            <div className="bg-white border border-brand-border/60 rounded-xl p-4 flex gap-3 shadow-sm hover:border-brand-light/35 transition-colors duration-250">
              <Briefcase className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Total Work Experience</span>
                <span className="text-sm font-semibold text-brand-text">{extra.workExperience} months</span>
              </div>
            </div>
          )}

          {/* UG / PG Card */}
          {(extra.ug || extra.pg) && (
            <div className="bg-white border border-brand-border/60 rounded-xl p-4 flex gap-3 shadow-sm hover:border-brand-light/35 transition-colors duration-250 md:col-span-2">
              <Award className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div className="space-y-2 w-full">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Education & Degrees</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {extra.ug && (
                    <div className="bg-gray-50/50 p-3 rounded-lg border border-brand-border/50">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Undergraduate (UG)</span>
                      <p className="text-xs font-semibold text-gray-700 mt-1">{extra.ug}</p>
                    </div>
                  )}
                  {extra.pg && (
                    <div className="bg-gray-50/50 p-3 rounded-lg border border-brand-border/50">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Postgraduate (PG)</span>
                      <p className="text-xs font-semibold text-gray-700 mt-1">{extra.pg}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Social Links Card */}
          {(extra.linkedin || extra.github) && (
            <div className="bg-white border border-brand-border/60 rounded-xl p-4 flex gap-3 shadow-sm hover:border-brand-light/35 transition-colors duration-250 md:col-span-2">
              <Compass className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div className="space-y-2 w-full">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Professional Profiles</span>
                <div className="flex flex-wrap gap-3">
                  {extra.linkedin && (
                    <a
                      href={extra.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100/70 transition-all"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      LinkedIn Profile
                    </a>
                  )}
                  {extra.github && (
                    <a
                      href={extra.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all"
                    >
                      <Github className="w-3.5 h-3.5" />
                      GitHub Profile
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </Modal>
  );
};

export default CandidateDetailsModal;
