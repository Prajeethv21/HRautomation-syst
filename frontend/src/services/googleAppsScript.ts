export type ATSStatus = 'Selected' | 'Interviewing' | 'On Hold' | 'Rejected';
export type ATSSource = 'LinkedIn' | 'Career Page' | 'Referral' | 'Website' | 'Manual Entry' | 'Other';

export interface Candidate {
  candidateName: string;
  email: string;
  role: string;
  joiningDate: string;
  status: ATSStatus | string;
  emailStatus: 'Pending' | 'Sent' | 'Failed';
  source?: ATSSource | string;
  resumeFileId?: string;
}

export interface DepartmentCandidate {
  candidateName: string;
  email: string;
  phoneNumber: string;
  workExperience: string;
  ug: string;
  pg: string;
  college: string;
  location: string;
  linkedin: string;
  github: string;
  status: ATSStatus | string;
  source?: ATSSource | string;
  resumeFileId?: string;
}

export interface DashboardStats {
  totalCandidates: number;
  pendingEmails: number;
  emailsSent: number;
  selectedCandidates: number;
}

export const getCandidates = async (): Promise<Candidate[]> => {
  try {
    const response = await fetch('/api/candidates');

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
      emailsSent: candidates.filter((c) => c.emailStatus === 'Sent').length,
      selectedCandidates: candidates.filter((c) => c.status === 'Selected').length
    };
  } catch (error) {
    console.error('Failed to get dashboard statistics:', error);
    throw new Error('Unable to connect to Google Sheets');
  }
};

export const sendJoiningLetter = async (rowNumber: number): Promise<{ success: boolean; message: string }> => {
  try {
    // Retrieve latest candidates list to map rowNumber to email
    const candidates = await getCandidates();
    const index = rowNumber - 2; // Row 2 is index 0

    if (index < 0 || index >= candidates.length) {
      throw new Error('Candidate row index out of bounds');
    }

    const candidateEmail = candidates[index].email;
    const requestPayload = { email: candidateEmail };

    console.log('React sending POST request to /api/candidates/send with body:', JSON.stringify(requestPayload));

    const response = await fetch('/api/candidates/send', {
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
    // Align payload with joining workflow: use candidateEmail key
    const requestPayload = { candidateEmail: email };
    console.log('Rejection payload:', requestPayload);

    const response = await fetch('/api/candidates/reject', {
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

export const updateCandidateStatus = async (email: string, status: string): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("STATUS UPDATE START");
    console.log("Email:", email);
    console.log("Status:", status);
    const payload = { email, status };

    const response = await fetch('/api/candidates/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Status update response status:', response.status);

    // Try to parse response regardless of status code
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

export const getDepartmentCandidates = async (sheetName: string): Promise<DepartmentCandidate[]> => {
  try {
    const response = await fetch(`/api/departments/${encodeURIComponent(sheetName)}`);

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
    const response = await fetch('/api/resumes/process', {
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


