export type ATSStatus = 'Submitted' | 'Shortlisted' | 'Scheduled' | 'On Hold' | 'Selected' | 'Rejected' | 'Interviewing';
export type ATSSource = 'LinkedIn' | 'Career Page' | 'Referral' | 'Website' | 'Manual Entry' | 'Other';

export interface Candidate {
  candidateName: string;
  email: string;
  role: string;
  joiningDate: string;
  status: ATSStatus | string;
  emailStatus: string;
  source?: ATSSource | string;
  resumeFileId?: string;
  interviewDate?: string;
  interviewTime?: string;
}

export interface DepartmentCandidate {
  candidateName: string;
  email: string;
  phoneNumber: string;
  ug: string;
  pg: string;
  college: string;
  location?: string;
  linkedin: string;
  github: string;
  status: ATSStatus | string;
  source?: ATSSource | string;
  resumeFileId?: string;
  interviewDate?: string;
  interviewTime?: string;
}

export interface DashboardStats {
  totalCandidates: number;
  pendingEmails: number;
  emailsSent: number;
  selectedCandidates: number;
}

// Authentication fetch wrapper
const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('ats_token');
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  return fetch(url, { ...options, headers });
};

export const getCandidates = async (): Promise<Candidate[]> => {
  try {
    const response = await fetchWithAuth('/api/candidates');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();

    if (responseData && responseData.success && Array.isArray(responseData.candidates)) {
      return responseData.candidates;
    }

    throw new Error(responseData?.message || 'Invalid data received from proxy backend');
  } catch (error: any) {
    console.error('Proxy candidates fetch failed:', error);
    throw new Error('Unable to connect to Google Sheets');
  }
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const candidates = await getCandidates();
    return {
      totalCandidates: candidates.length,
      pendingEmails: candidates.filter((c) => c.emailStatus === 'Pending').length,
      emailsSent: candidates.filter((c) => 
        c.emailStatus && (
          c.emailStatus.toLowerCase().includes('sent') || 
          c.emailStatus === 'Interview Scheduled'
        )
      ).length,
      selectedCandidates: candidates.filter((c) => c.status === 'Selected').length
    };
  } catch (error) {
    console.error('Failed to get dashboard statistics:', error);
    throw new Error('Unable to connect to Google Sheets');
  }
};

export const sendJoiningLetter = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const requestPayload = { email };

    console.log('React sending POST request to /api/candidates/send with body:', JSON.stringify(requestPayload));

    const response = await fetchWithAuth('/api/candidates/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    console.log('React received response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('React received response body:', JSON.stringify(responseData));

    if (responseData && responseData.success) {
      return {
        success: true,
        message: responseData.message || 'Joining Letter Sent Successfully'
      };
    }

    throw new Error(responseData?.message || 'Proxy backend returned failure status');
  } catch (error: any) {
    console.error('Proxy POST failed:', error);
    throw new Error('Failed To Send Joining Letter');
  }
};

export const sendRejectionEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const requestPayload = { candidateEmail: email };
    console.log('Rejection payload:', requestPayload);

    const response = await fetchWithAuth('/api/candidates/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload)
    });

    console.log('React received rejection response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('React received rejection response body:', JSON.stringify(responseData));

    if (responseData && responseData.success) {
      return {
        success: true,
        message: responseData.message || 'Rejection Email Sent Successfully'
      };
    }

    throw new Error(responseData?.message || 'Proxy backend returned failure status');
  } catch (error: any) {
    console.error('Proxy rejection POST failed:', error);
    throw new Error('Failed To Send Rejection Email');
  }
};

export const sendInterviewEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const requestPayload = { email };
    console.log('Sending interview email payload:', requestPayload);

    const response = await fetchWithAuth('/api/candidates/interview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload)
    });

    console.log('React received interview response status:', response.status);

    const responseData = await response.json().catch(() => ({}));
    console.log('React received interview response body:', JSON.stringify(responseData));

    if (response.ok && responseData?.success) {
      return {
        success: true,
        message: responseData.message || 'Interview Email Sent Successfully'
      };
    }

    throw new Error(responseData?.message || `HTTP error! status: ${response.status}`);
  } catch (error: any) {
    console.error('Proxy interview POST failed:', error);
    throw new Error(error.message || 'Failed To Send Interview Email');
  }
};

export const updateCandidateStatus = async (email: string, status: string): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("STATUS UPDATE START");
    console.log("Email:", email);
    console.log("Status:", status);
    const payload = { email, status };

    const response = await fetchWithAuth('/api/candidates/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Status update response status:', response.status);

    let responseData: any = null;
    try {
      responseData = await response.json();
      console.log("Response:", responseData);
    } catch (_) {
      console.warn('Could not parse status update response body');
    }

    if (response.ok && responseData?.success) {
      return { success: true, message: responseData.message || 'Status updated successfully' };
    }

    const errMsg = responseData?.error || responseData?.message || `HTTP ${response.status}`;
    console.warn('Status update backend error:', errMsg);
    return { success: false, message: errMsg };

  } catch (error: any) {
    console.error('Proxy status update POST failed:', error);
    return { success: false, message: error.message || 'Offline mode' };
  }
};

// Retry helper with exponential backoff
async function fetchWithRetry(url: string, maxRetries = 2, baseDelayMs = 2000): Promise<Response> {
  let lastError: Error = new Error('Unknown error');
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.log(`[RETRY] Attempt ${attempt + 1} for ${url} after ${delay}ms`);
      await new Promise(res => setTimeout(res, delay));
    }
    try {
      const response = await fetchWithAuth(url);
      // Only retry on server errors (500+), not client errors (4xx)
      if (response.status >= 500 && attempt < maxRetries) {
        lastError = new Error(`HTTP error! status: ${response.status}`);
        console.warn(`[RETRY] Got ${response.status}, will retry...`);
        continue;
      }
      return response;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) continue;
    }
  }
  throw lastError;
}

export const getDepartmentCandidates = async (sheetName: string): Promise<DepartmentCandidate[]> => {
  try {
    const response = await fetchWithRetry(`/api/departments/${encodeURIComponent(sheetName)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();

    if (responseData && responseData.success && Array.isArray(responseData.candidates)) {
      return responseData.candidates;
    }

    throw new Error(responseData?.message || 'Invalid data received from proxy backend');
  } catch (error: any) {
    console.error(`Proxy department candidates fetch failed for ${sheetName}:`, error);
    throw new Error(`Unable to connect to Google Sheets for ${sheetName}`);
  }
};

export const triggerResumeProcessing = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetchWithAuth('/api/resumes/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    if (responseData && responseData.success) {
      return {
        success: true,
        message: responseData.message || 'Resumes processed successfully'
      };
    }
    throw new Error(responseData?.message || 'Backend returned failure status');
  } catch (error: any) {
    console.error('Proxy resume scan failed:', error);
    throw new Error('Failed to trigger resume processing');
  }
};

export const uploadResumes = async (files: File[], departmentId: string): Promise<{ success: boolean; message: string; results?: any[] }> => {
  try {
    const formData = new FormData();
    formData.append('departmentId', departmentId);
    files.forEach((file) => {
      formData.append('resumes', file);
    });

    const response = await fetchWithAuth('/api/resumes/upload', {
      method: 'POST',
      body: formData
    });

    const responseData = await response.json();
    if (response.ok && responseData?.success) {
      return {
        success: true,
        message: responseData.message || 'Resumes uploaded successfully',
        results: responseData.results
      };
    }
    throw new Error(responseData?.error || responseData?.message || `HTTP error! status: ${response.status}`);
  } catch (error: any) {
    console.error('Proxy resume upload failed:', error);
    throw new Error(error.message || 'Failed to upload resumes');
  }
};
