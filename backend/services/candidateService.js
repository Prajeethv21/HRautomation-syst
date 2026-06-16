import axios from 'axios';
import dotenv from 'dotenv';

// Load variables
dotenv.config();

let candidatesCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5000; // 5 seconds in-memory cache

// Per-department cache
const deptCandidatesCache = {};
const deptCacheTimestamps = {};
const DEPT_CACHE_TTL_MS = 30000; // 30 seconds per-department cache

export function clearCandidatesCache() {
  candidatesCache = null;
  cacheTimestamp = 0;
}

function getCredentials() {
  const url = process.env.VITE_APPS_SCRIPT_URL;
  const sheetId = process.env.VITE_GOOGLE_SHEET_ID;
  const templateId = process.env.VITE_TEMPLATE_ID || '1T7cl_UOi8ojl5tR99gplQCJuNARs4hD5kTZw9NXT3tw';

  if (!url || !sheetId) {
    throw new Error('Google Apps Script URL or Google Sheet ID is not configured in backend .env file');
  }

  return { url, sheetId, templateId };
}

export async function fetchCandidates() {
  if (candidatesCache && (Date.now() - cacheTimestamp < CACHE_TTL_MS)) {
    console.log('[CACHE HIT] Returning cached candidates list');
    return { data: candidatesCache, mode: 'google' };
  }

  const { url, sheetId } = getCredentials();

  try {
    console.log('[CACHE MISS] Fetching candidates from Apps Script Web App');
    const response = await axios.get(url, {
      params: {
        action: 'getCandidates',
        sheetId: sheetId
      },
      timeout: 20000 // 20 second timeout
    });

    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      candidatesCache = response.data.data;
      cacheTimestamp = Date.now();
      return { data: candidatesCache, mode: 'google' };
    }

    if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      console.error('[BACKEND] Apps Script returned HTML response instead of JSON. Snippet:', response.data.slice(0, 300));
    } else {
      console.error('[BACKEND] Invalid response body from Apps Script:', JSON.stringify(response.data));
    }
    const errMsg = response.data?.message || 'Apps Script returned success: false or invalid candidate data';
    throw new Error(errMsg);
  } catch (error) {
    console.error('Apps Script fetch failed:', error.message);
    throw new Error(`Invalid response structure from Apps Script Web App: ${error.message}`);
  }
}

export async function fetchCandidateByEmail(email) {
  const { data } = await fetchCandidates();
  const candidate = data.find(c => c.email === email);
  if (!candidate) {
    throw new Error(`Candidate with email ${email} not found`);
  }
  return candidate;
}

export async function sendJoiningLetterWorkflow(email) {
  clearCandidatesCache();
  const { url, sheetId, templateId } = getCredentials();

  const payload = {
    action: 'sendJoiningLetter',
    sheetId: sheetId,
    templateId: templateId,
    candidateEmail: email
  };

  console.log('Backend sending POST to Apps Script URL:', url);
  console.log('Backend payload to Apps Script:', JSON.stringify(payload));

  console.log("Calling Apps Script:", payload);

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000 // 60s timeout — Drive.Files.copy + PDF generation + GmailApp can take 30-50s
    });

    console.log("Apps Script Response:", response.data);
    console.log('Backend received Apps Script response status:', response.status);
    console.log('Backend received Apps Script response body:', JSON.stringify(response.data));

    if (response.data && response.data.success) {
      return {
        success: true,
        mode: 'google',
        message: response.data.message || 'Joining Letter Sent Successfully'
      };
    }

    throw new Error(response.data?.message || 'Apps Script returned failure status');
  } catch (error) {
    console.error("Apps Script Error:", error.response?.data || error.message);
    console.error(`Apps Script send workflow failed: ${error.message}`);
    if (error.response) {
      console.error('Apps Script error response status:', error.response.status);
      console.error('Apps Script error response body:', JSON.stringify(error.response.data));
    }
    throw new Error(`Failed to Send Joining Letter: ${error.message}`);
  }
}

export async function sendRejectionEmailWorkflow(email) {
  clearCandidatesCache();
  const { url, sheetId } = getCredentials();

  const payload = {
    action: 'sendRejectionEmail',
    sheetId: sheetId,
    candidateEmail: email
  };

  console.log('Backend sending POST to Apps Script for rejection email:', url);
  console.log('Backend rejection email payload:', JSON.stringify(payload));

  console.log("Calling Apps Script:", payload);

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    console.log("Apps Script Response:", response.data);
    console.log('Backend received Apps Script response status:', response.status);
    console.log('Backend received Apps Script response body:', JSON.stringify(response.data));

    if (response.data && response.data.success) {
      return {
        success: true,
        mode: 'google',
        message: response.data.message || 'Rejection Email Sent Successfully'
      };
    }

    throw new Error(response.data?.message || 'Apps Script returned failure status');
  } catch (error) {
    console.error("Apps Script Error:", error.response?.data || error.message);
    console.error(`Apps Script rejection email workflow failed: ${error.message}`);
    if (error.response) {
      console.error('Apps Script error response status:', error.response.status);
      console.error('Apps Script error response body:', JSON.stringify(error.response.data));
    }
    throw new Error(`Failed To Send Rejection Email: ${error.message}`);
  }
}

export async function sendInterviewEmailWorkflow(email) {
  clearCandidatesCache();
  const { url, sheetId } = getCredentials();

  const payload = {
    action: 'sendInterviewEmail',
    sheetId: sheetId,
    candidateEmail: email
  };

  console.log('Backend sending POST to Apps Script for interview email:', url);
  console.log('Backend interview email payload:', JSON.stringify(payload));

  console.log("Calling Apps Script:", payload);

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    console.log("Apps Script Response:", response.data);
    console.log('Backend received Apps Script response status:', response.status);
    console.log('Backend received Apps Script response body:', JSON.stringify(response.data));

    if (response.data && response.data.success) {
      return {
        success: true,
        mode: 'google',
        message: response.data.message || 'Interview Email Sent Successfully'
      };
    }

    throw new Error(response.data?.message || 'Apps Script returned failure status');
  } catch (error) {
    console.error("Apps Script Error:", error.response?.data || error.message);
    console.error(`Apps Script interview email workflow failed: ${error.message}`);
    if (error.response) {
      console.error('Apps Script error response status:', error.response.status);
      console.error('Apps Script error response body:', JSON.stringify(error.response.data));
    }
    throw new Error(`Failed to Send Interview Email: ${error.message}`);
  }
}

export async function updateCandidateStatus(email, status) {
  clearCandidatesCache();
  const { url, sheetId } = getCredentials();

  const payload = {
    action: 'updateCandidateStatus',
    sheetId: sheetId,
    candidateEmail: email,
    status: status
  };

  console.log('Backend sending POST to Apps Script for status update:', url);
  console.log('Backend status update payload:', JSON.stringify(payload));

  console.log("Calling Apps Script:", payload);

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    console.log("Apps Script Response:", response.data);
    console.log('Backend received Apps Script response status:', response.status);
    console.log('Backend received Apps Script response body:', JSON.stringify(response.data));

    if (response.data && response.data.success) {
      return { success: true, message: response.data.message || 'Status updated successfully' };
    }

    throw new Error(response.data?.message || 'Apps Script returned failure status');
  } catch (error) {
    console.error("Apps Script Error:", error.response?.data || error.message);
    console.error(`Apps Script status update failed: ${error.message}`);
    if (error.response) {
      console.error('Apps Script error response status:', error.response.status);
      console.error('Apps Script error response body:', JSON.stringify(error.response.data));
    }
    throw new Error(`Failed to update status: ${error.message}`);
  }
}

export async function fetchDepartmentCandidates(sheetName) {
  // Serve from cache if fresh
  const now = Date.now();
  if (deptCandidatesCache[sheetName] && (now - (deptCacheTimestamps[sheetName] || 0)) < DEPT_CACHE_TTL_MS) {
    console.log(`[CACHE HIT] Returning cached department candidates for: ${sheetName}`);
    return { data: deptCandidatesCache[sheetName] };
  }

  const { url, sheetId } = getCredentials();

  console.log(`\n==================================================`);
  console.log(`[BACKEND] Fetching department candidates for: "${sheetName}"`);
  console.log(`[BACKEND] Apps Script Endpoint URL: ${url}`);
  console.log(`[BACKEND] Target Google Sheet ID: ${sheetId}`);

  try {
    const response = await axios.get(url, {
      params: {
        action: 'getDepartmentCandidates',
        sheetId: sheetId,
        sheetName: sheetName
      },
      timeout: 45000,
      maxRedirects: 10
    });

    console.log(`[BACKEND] Apps Script Response Code: ${response.status}`);
    if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      console.log(`[BACKEND] Apps Script Response Body (HTML snippet):`, response.data.slice(0, 300));
    } else {
      console.log(`[BACKEND] Apps Script Response Body:`, JSON.stringify(response.data).slice(0, 300));
    }

    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      console.log(`[BACKEND] Sheet Lookup Result: SUCCESS, found ${response.data.data.length} candidates`);
      console.log(`==================================================\n`);
      // Cache the result
      deptCandidatesCache[sheetName] = response.data.data;
      deptCacheTimestamps[sheetName] = Date.now();
      return { data: response.data.data };
    }

    if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      console.error('[BACKEND] Apps Script returned HTML instead of JSON. Script may need redeployment.');
    }
    const errMsg = response.data?.message || 'Apps Script returned success: false or invalid department candidate data';
    console.log(`[BACKEND] Sheet Lookup Result: FAILED - message: ${errMsg}`);
    console.log(`==================================================\n`);
    throw new Error(errMsg);
  } catch (error) {
    console.error(`[BACKEND] Exception caught during fetch for ${sheetName}:`, error.message);
    if (error.response) {
      console.error(`[BACKEND] HTTP Response Status: ${error.response.status}`);
      console.error(`[BACKEND] HTTP Response Data:`, JSON.stringify(error.response.data).slice(0, 200));
    }
    console.log(`==================================================\n`);
    throw new Error(`Failed to fetch department candidates: ${error.message}`);
  }
}

export async function triggerResumeProcessing() {
  clearCandidatesCache();
  const { url, sheetId } = getCredentials();
  const groqApiKey = process.env.GROQ_API_KEY || '';

  try {
    console.log('[BACKEND] Sending POST request to Apps Script to scan and process resumes...');
    const response = await axios.post(url, {
      action: 'processResumes',
      sheetId: sheetId,
      groqApiKey: groqApiKey
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 45000 // 45s timeout for OCR parsing
    });

    console.log('Apps Script scan response status:', response.status);
    console.log('Apps Script scan response body:', JSON.stringify(response.data));

    if (response.data && response.data.success) {
      if (response.data.logs) {
        console.log("=== Apps Script Logs during Resume Processing ===\n" + response.data.logs + "\n==============================================");
      }
      return { success: true, message: response.data.message };
    }

    if (response.data && response.data.logs) {
      console.log("=== Apps Script Logs during Failed Resume Processing ===\n" + response.data.logs + "\n==============================================");
    }

    throw new Error(response.data?.message || 'Apps Script returned failure status');
  } catch (error) {
    console.error('Apps Script resume scan failed:', error.message);
    if (error.response && error.response.data) {
      console.error('Error response data:', JSON.stringify(error.response.data));
    }
    throw new Error(`Failed to process resumes: ${error.message}`);
  }
}

export async function repairCandidatesWorkflow() {
  const { url, sheetId } = getCredentials();
  const groqApiKey = process.env.GROQ_API_KEY || '';
  try {
    console.log('[BACKEND] Sending POST request to Apps Script to trigger data repair/sync...');
    const response = await axios.post(url, {
      action: 'repairData',
      sheetId: sheetId,
      groqApiKey: groqApiKey
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000 // 2 minute timeout
    });

    console.log('Apps Script repair response status:', response.status);
    if (response.data && response.data.logs) {
      console.log("=== Apps Script Logs during Repair ===\n" + response.data.logs + "\n=====================================");
    }
    return response.data;
  } catch (error) {
    console.error('Apps Script repair failed:', error.message);
    throw error;
  }
}

export async function uploadResumeToDrive(fileBuffer, fileName, departmentId) {
  const { url, sheetId } = getCredentials();
  
  const deptMap = {
    'sustainability': 'Sustainability',
    'ai-data-engineer': 'AI/Data Engineer',
    'web-developer': 'Web Developer',
    'marketing': 'Marketing',
    'creative': 'Creative',
    'others': 'Others'
  };

  const roleName = deptMap[departmentId] || 'Others';

  // Convert file buffer to Base64 string
  const fileData = fileBuffer.toString('base64');

  const payload = {
    action: 'uploadResume',
    sheetId: sheetId,
    fileData: fileData,
    fileName: fileName,
    roleName: roleName
  };

  console.log(`[BACKEND] Uploading resume ${fileName} for department/role: ${roleName}`);

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000 // 60s timeout for Base64 upload + file creation in Drive
    });

    console.log('Apps Script upload response status:', response.status);
    console.log('Apps Script upload response body:', JSON.stringify(response.data));

    if (response.data && response.data.success) {
      return { success: true, fileId: response.data.fileId, message: response.data.message };
    }

    throw new Error(response.data?.message || 'Apps Script returned failure status for upload');
  } catch (error) {
    console.error('Apps Script resume upload failed:', error.message);
    if (error.response && error.response.data) {
      console.error('Error response data:', JSON.stringify(error.response.data));
    }
    throw new Error(`Failed to upload resume to Drive: ${error.message}`);
  }
}

