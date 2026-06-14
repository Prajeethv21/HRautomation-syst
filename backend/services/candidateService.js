import axios from 'axios';
import dotenv from 'dotenv';

// Load variables
dotenv.config();

function getCredentials() {
  const url = process.env.VITE_APPS_SCRIPT_URL;
  const sheetId = process.env.VITE_GOOGLE_SHEET_ID;
  const templateId = process.env.VITE_TEMPLATE_ID;

  if (!url || !sheetId) {
    throw new Error('Google Apps Script URL or Google Sheet ID is not configured in backend .env file');
  }

  return { url, sheetId, templateId };
}

export async function fetchCandidates() {
  const { url, sheetId } = getCredentials();

  try {
    const response = await axios.get(url, {
      params: {
        action: 'getCandidates',
        sheetId: sheetId
      },
      timeout: 10000 // 10 second timeout
    });

    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return { data: response.data.data, mode: 'google' };
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
  const { url, sheetId, templateId } = getCredentials();
  
  if (!templateId) {
    throw new Error('Google Docs Template ID is not configured in backend .env file');
  }

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
      timeout: 20000 // 20s timeout for generation and email send
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
      timeout: 20000
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
export async function updateCandidateStatus(email, status) {
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
      timeout: 20000
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
