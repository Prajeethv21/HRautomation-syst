import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

function getCredentials() {
  const url = process.env.VITE_APPS_SCRIPT_URL;
  const sheetId = process.env.VITE_GOOGLE_SHEET_ID;
  if (!url || !sheetId) {
    throw new Error('Google Apps Script URL or Sheet ID is not configured in backend environment');
  }
  return { url, sheetId };
}

// Base Candidate Source Class
export class BaseCandidateSource {
  constructor(sourceName) {
    this.sourceName = sourceName;
  }
  
  async validate(candidate) {
    if (!candidate.candidateName || !candidate.email || !candidate.role) {
      throw new Error('Candidate Name, Email, and Role are required fields');
    }
  }

  async format(candidate) {
    return {
      name: candidate.candidateName,
      email: candidate.email,
      role: candidate.role,
      joiningDate: candidate.joiningDate || '',
      status: candidate.status || 'Interviewing',
      emailStatus: candidate.emailStatus || 'Pending',
      source: this.sourceName,
      phoneNumber: candidate.phoneNumber || '',
      ug: candidate.ug || '',
      pg: candidate.pg || '',
      college: candidate.college || '',
      graduationYear: candidate.graduationYear || '',
      location: candidate.location || '',
      linkedin: candidate.linkedin || '',
      github: candidate.github || ''
    };
  }
}

// Website Ingestion Handler
export class WebsiteSourceHandler extends BaseCandidateSource {
  constructor() {
    super('Website');
  }
  
  async process(candidateData) {
    await this.validate(candidateData);
    return await this.format(candidateData);
  }
}

// LinkedIn Ingestion Handler (automation structure ready)
export class LinkedInSourceHandler extends BaseCandidateSource {
  constructor() {
    super('LinkedIn');
  }

  async process(candidateData) {
    await this.validate(candidateData);
    const formatted = await this.format(candidateData);
    
    // Auto-generate standard LinkedIn URL prefix if only username provided
    let linkedinUrl = candidateData.linkedin || '';
    if (linkedinUrl && !linkedinUrl.startsWith('http')) {
      linkedinUrl = `https://linkedin.com/in/${linkedinUrl}`;
    }
    
    return {
      ...formatted,
      linkedin: linkedinUrl
    };
  }
}

// Other Sources Ingestion Handler
export class OtherSourceHandler extends BaseCandidateSource {
  constructor() {
    super('Other');
  }

  async process(candidateData) {
    await this.validate(candidateData);
    return await this.format(candidateData);
  }
}

const sourceHandlers = {
  Website: new WebsiteSourceHandler(),
  LinkedIn: new LinkedInSourceHandler(),
  Other: new OtherSourceHandler()
};

// Main entry point for ingesting candidate data
export async function ingestCandidate(candidateData, source = 'Other') {
  const handler = sourceHandlers[source] || sourceHandlers.Other;
  const processedCandidate = await handler.process(candidateData);
  
  const { url, sheetId } = getCredentials();
  
  const payload = {
    action: 'createCandidate',
    sheetId: sheetId,
    candidate: processedCandidate
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000
    });
    
    if (response.data && response.data.success) {
      return { success: true, message: response.data.message };
    }
    
    throw new Error(response.data?.message || 'Apps Script returned failure status');
  } catch (error) {
    console.error('Candidate Ingestion Error:', error.message);
    throw new Error(`Failed to ingest candidate: ${error.message}`);
  }
}
