import React, { useState, useEffect } from 'react';
import { useAuth, type User } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { 
  Users, UserCheck, History, Calendar, Check, Search, RefreshCw 
} from 'lucide-react';
import Button from '../components/ui/Button';

interface AuditLog {
  id: string;
  userEmail: string;
  action: string;
  timestamp: string;
}

const AdminPanel: React.FC = () => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'logs'>('pending');
  
  // States
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allHRUsers, setAllHRUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Expiry configuration states
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [expiryOption, setExpiryOption] = useState<'30' | '90' | 'custom'>('30');
  const [customDate, setCustomDate] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Fetch pending approvals
  const fetchPendingUsers = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/admin/users/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPendingUsers(data.users || []);
      } else {
        showToast(data.error || 'Failed to fetch pending users', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading pending users', 'error');
    }
  };

  // Fetch all HR users
  const fetchAllHRUsers = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/admin/users/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAllHRUsers(data.users || []);
      } else {
        showToast(data.error || 'Failed to fetch user directory', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading user directory', 'error');
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/admin/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAuditLogs(data.logs || []);
      } else {
        showToast(data.error || 'Failed to fetch audit logs', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading audit logs', 'error');
    }
  };

  const loadData = async () => {
    setLoading(true);
    if (activeTab === 'pending') {
      await fetchPendingUsers();
    } else if (activeTab === 'users') {
      await fetchAllHRUsers();
    } else if (activeTab === 'logs') {
      await fetchAuditLogs();
    }
    setLoading(false);
  };

  // Reload data when switching tabs
  useEffect(() => {
    loadData();
  }, [activeTab, token]);

  const handleApproveClick = (userId: string) => {
    setSelectedUserId(userId);
    setExpiryOption('30');
    setCustomDate('');
  };

  const submitApproval = async (userId: string) => {
    if (!token) return;
    setSubmittingAction(true);

    const payload: any = { userId };
    if (expiryOption === '30') {
      payload.expiryDays = 30;
    } else if (expiryOption === '90') {
      payload.expiryDays = 90;
    } else {
      if (!customDate) {
        showToast('Please select a custom expiry date', 'error');
        setSubmittingAction(false);
        return;
      }
      payload.customExpiryDate = new Date(customDate).toISOString();
    }

    try {
      const response = await fetch('/api/admin/users/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast(`Approved access for ${data.user.name}`, 'success');
        setSelectedUserId(null);
        fetchPendingUsers();
      } else {
        showToast(data.error || 'Failed to approve user', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error during approval request', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async (userId: string) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to REJECT this access request?')) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast('Access request rejected successfully', 'success');
        fetchPendingUsers();
      } else {
        showToast(data.error || 'Failed to reject user', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error rejecting access request', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (userId: string) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to DISABLE this user account? This will revoke active sessions.')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/users/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast('User account has been disabled and sessions revoked', 'success');
        fetchAllHRUsers();
      } else {
        showToast(data.error || 'Failed to disable user', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error disabling user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableClick = (userId: string) => {
    setSelectedUserId(userId);
    setExpiryOption('30');
    setCustomDate('');
  };

  const submitEnable = async (userId: string) => {
    if (!token) return;
    setSubmittingAction(true);

    const payload: any = { userId };
    if (expiryOption === '30') {
      payload.expiryDays = 30;
    } else if (expiryOption === '90') {
      payload.expiryDays = 90;
    } else {
      if (!customDate) {
        showToast('Please select a custom expiry date', 'error');
        setSubmittingAction(false);
        return;
      }
      payload.customExpiryDate = new Date(customDate).toISOString();
    }

    try {
      const response = await fetch('/api/admin/users/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast(`User account re-enabled successfully`, 'success');
        setSelectedUserId(null);
        fetchAllHRUsers();
      } else {
        showToast(data.error || 'Failed to enable user', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error enabling user', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Filtered lists based on search bar
  const filteredHRUsers = allHRUsers.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = auditLogs.filter(log => 
    log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) || 
    log.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-jakarta">
      {/* Upper Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-brand-border shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-brand-text">User Access Management</h1>
          <p className="text-xs text-gray-500 mt-1">Manage portal roles, system registrations, and view internal action audits.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadData}
            disabled={loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh List
          </Button>
        </div>
      </div>

      {/* Tabs Layout - horizontally scrollable on mobile */}
      <div className="flex border-b border-brand-border overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => { setActiveTab('pending'); setSelectedUserId(null); }}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-colors duration-150 ${
            activeTab === 'pending'
              ? 'border-[#6FAF45] text-[#6FAF45]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Pending Approvals
          {pendingUsers.length > 0 && (
            <span className="ml-1 bg-red-100 text-red-600 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('users'); setSelectedUserId(null); }}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-colors duration-150 ${
            activeTab === 'users'
              ? 'border-[#6FAF45] text-[#6FAF45]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          User Directory
        </button>
        <button
          onClick={() => { setActiveTab('logs'); setSelectedUserId(null); }}
          className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-colors duration-150 ${
            activeTab === 'logs'
              ? 'border-[#6FAF45] text-[#6FAF45]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4" />
          Audit Logs
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-2xl border border-brand-border shadow-[0_4px_25px_rgba(0,0,0,0.01)] overflow-hidden min-h-[400px]">
        {/* Search Bar for management lists */}
        {activeTab !== 'pending' && (
          <div className="p-4 border-b border-brand-border bg-gray-50 flex items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={activeTab === 'users' ? "Search users by name or email..." : "Search audits by email or action..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 text-xs pl-9 pr-4 bg-white border border-brand-border rounded-xl focus:border-[#6FAF45]/50 focus:ring-1 focus:ring-[#6FAF45]/20 text-brand-text placeholder-gray-400 font-medium transition-colors"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <RefreshCw className="w-8 h-8 text-[#6FAF45] animate-spin mb-3" />
            <p className="text-sm font-medium text-gray-500">Retrieving security records...</p>
          </div>
        ) : (
          <div className="p-6">
            {/* PENDING APPROVALS TAB */}
            {activeTab === 'pending' && (
              <>
                {pendingUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-brand-light flex items-center justify-center mb-3">
                      <Check className="w-6 h-6 text-[#6FAF45]" />
                    </div>
                    <h3 className="text-sm font-bold text-brand-text">No Pending Registrations</h3>
                    <p className="text-xs text-gray-500 mt-1">All internal access requests are processed.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingUsers.map((user) => (
                      <div 
                        key={user.id} 
                        className="flex flex-col border border-brand-border rounded-2xl p-5 hover:shadow-[0_4px_15px_rgba(0,0,0,0.015)] transition-shadow"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-extrabold text-brand-text">{user.name}</h4>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">{user.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] font-bold rounded-md uppercase tracking-wider">
                                Awaiting Approval
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium">
                                Role: {user.role}
                              </span>
                            </div>
                          </div>

                          {selectedUserId !== user.id ? (
                            <div className="flex items-center gap-3">
                              <Button 
                                variant="primary" 
                                size="sm" 
                                onClick={() => handleApproveClick(user.id)}
                                className="h-9 px-4 rounded-xl"
                              >
                                Approve...
                              </Button>
                              <Button 
                                variant="danger" 
                                size="sm" 
                                onClick={() => handleReject(user.id)}
                                className="h-9 px-4 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border-none"
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <div className="w-full md:w-auto bg-[#F9FAFB] border border-brand-border rounded-xl p-4 space-y-3 animate-fade-in">
                              <p className="text-xs font-bold text-gray-600">Select Access Duration</p>
                              
                              <div className="flex flex-wrap items-center gap-3">
                                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="expiry" 
                                    checked={expiryOption === '30'} 
                                    onChange={() => setExpiryOption('30')}
                                    className="accent-[#6FAF45]"
                                  />
                                  30 Days
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="expiry" 
                                    checked={expiryOption === '90'} 
                                    onChange={() => setExpiryOption('90')}
                                    className="accent-[#6FAF45]"
                                  />
                                  90 Days
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="expiry" 
                                    checked={expiryOption === 'custom'} 
                                    onChange={() => setExpiryOption('custom')}
                                    className="accent-[#6FAF45]"
                                  />
                                  Custom Expiry Date
                                </label>
                              </div>

                              {expiryOption === 'custom' && (
                                <div className="relative max-w-[200px]">
                                  <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                  <input 
                                    type="date"
                                    value={customDate}
                                    onChange={(e) => setCustomDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full h-8 text-xs pl-8 pr-3 border border-brand-border rounded-lg bg-white focus:outline-none"
                                  />
                                </div>
                              )}

                              <div className="flex gap-2 justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedUserId(null)}
                                  className="h-8 text-[11px] font-bold"
                                  disabled={submittingAction}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  variant="primary" 
                                  size="sm"
                                  onClick={() => submitApproval(user.id)}
                                  className="h-8 text-[11px] font-bold px-3 rounded-lg"
                                  isLoading={submittingAction}
                                >
                                  Confirm Approval
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* USER DIRECTORY TAB */}
            {activeTab === 'users' && (
              <>
                {filteredHRUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="w-10 h-10 text-gray-300 mb-3" />
                    <h3 className="text-sm font-bold text-brand-text">No Users Found</h3>
                    <p className="text-xs text-gray-500 mt-1">Try adjusting your search criteria.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-brand-border text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                          <th className="pb-3 pr-4">User</th>
                          <th className="pb-3 px-4">Current Status</th>
                          <th className="pb-3 px-4">Expires On</th>
                          <th className="pb-3 pl-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border text-xs">
                        {filteredHRUsers.map((user) => {
                          const isExpired = user.expiryDate && new Date() > new Date(user.expiryDate);
                          
                          return (
                            <tr key={user.id} className="hover:bg-brand-light/5 transition-colors">
                              <td className="py-4 pr-4">
                                <span className="font-extrabold text-brand-text block">{user.name}</span>
                                <span className="text-[11px] text-gray-400 font-medium block mt-0.5">{user.email}</span>
                              </td>
                              <td className="py-4 px-4">
                                {isExpired ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 text-[10px] font-bold rounded-md uppercase">
                                    Expired
                                  </span>
                                ) : user.status === 'APPROVED' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-md uppercase">
                                    Approved
                                  </span>
                                ) : user.status === 'DISABLED' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-md uppercase">
                                    Disabled
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 text-[10px] font-bold rounded-md uppercase">
                                    {user.status}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 font-medium text-gray-600">
                                {user.expiryDate ? (
                                  new Date(user.expiryDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                ) : (
                                  <span className="text-gray-400">Never</span>
                                )}
                              </td>
                              <td className="py-4 pl-4 text-right">
                                {selectedUserId === user.id ? (
                                  <div className="inline-block text-left bg-[#F9FAFB] border border-brand-border rounded-xl p-4 space-y-3 max-w-[280px] text-left animate-fade-in shadow-sm">
                                    <p className="text-xs font-bold text-gray-600">Set Re-Enable Duration</p>
                                    <div className="flex flex-col gap-2">
                                      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                        <input 
                                          type="radio" 
                                          name="reenable-expiry" 
                                          checked={expiryOption === '30'} 
                                          onChange={() => setExpiryOption('30')}
                                          className="accent-[#6FAF45]"
                                        />
                                        30 Days
                                      </label>
                                      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                        <input 
                                          type="radio" 
                                          name="reenable-expiry" 
                                          checked={expiryOption === '90'} 
                                          onChange={() => setExpiryOption('90')}
                                          className="accent-[#6FAF45]"
                                        />
                                        90 Days
                                      </label>
                                      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                        <input 
                                          type="radio" 
                                          name="reenable-expiry" 
                                          checked={expiryOption === 'custom'} 
                                          onChange={() => setExpiryOption('custom')}
                                          className="accent-[#6FAF45]"
                                        />
                                        Custom Expiry Date
                                      </label>
                                    </div>

                                    {expiryOption === 'custom' && (
                                      <div className="relative">
                                        <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input 
                                          type="date"
                                          value={customDate}
                                          onChange={(e) => setCustomDate(e.target.value)}
                                          min={new Date().toISOString().split('T')[0]}
                                          className="w-full h-8 text-xs pl-8 pr-3 border border-brand-border rounded-lg bg-white focus:outline-none"
                                        />
                                      </div>
                                    )}

                                    <div className="flex gap-2 justify-end">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => setSelectedUserId(null)}
                                        className="h-7 text-[10px] font-bold"
                                        disabled={submittingAction}
                                      >
                                        Cancel
                                      </Button>
                                      <Button 
                                        variant="primary" 
                                        size="sm"
                                        onClick={() => submitEnable(user.id)}
                                        className="h-7 text-[10px] font-bold px-2.5 rounded-lg"
                                        isLoading={submittingAction}
                                      >
                                        Confirm
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {user.status === 'APPROVED' && !isExpired ? (
                                      <Button 
                                        variant="danger" 
                                        size="sm" 
                                        onClick={() => handleDisable(user.id)}
                                        className="h-8 text-xs px-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border-none"
                                      >
                                        Disable
                                      </Button>
                                    ) : (
                                      <Button 
                                        variant="primary" 
                                        size="sm" 
                                        onClick={() => handleEnableClick(user.id)}
                                        className="h-8 text-xs px-3 rounded-lg"
                                      >
                                        Enable Access
                                      </Button>
                                    )}
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* AUDIT LOGS TAB */}
            {activeTab === 'logs' && (
              <>
                {filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <History className="w-10 h-10 text-gray-300 mb-3" />
                    <h3 className="text-sm font-bold text-brand-text">No Audit History</h3>
                    <p className="text-xs text-gray-500 mt-1">No system activity events recorded matching query.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-brand-border text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                          <th className="pb-3 pr-4">Action Event</th>
                          <th className="pb-3 px-4">User Identity</th>
                          <th className="pb-3 pl-4 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border text-xs text-gray-600">
                        {filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-brand-light/5 transition-colors">
                            <td className="py-3.5 pr-4 font-bold text-brand-text">
                              {log.action}
                            </td>
                            <td className="py-3.5 px-4 font-medium">
                              {log.userEmail}
                            </td>
                            <td className="py-3.5 pl-4 text-right text-gray-400 font-mono text-[11px]">
                              {new Date(log.timestamp).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
