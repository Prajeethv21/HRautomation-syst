import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

import {
  fetchCandidates,
  fetchCandidateByEmail,
  sendJoiningLetterWorkflow,
  sendRejectionEmailWorkflow,
  sendInterviewEmailWorkflow,
  updateCandidateStatus,
  fetchDepartmentCandidates,
  triggerResumeProcessing,
  repairCandidatesWorkflow,
  uploadResumeToDrive,
  parseResumeTextWithLLM
} from '../services/candidateService.js';
import { ingestCandidate } from '../services/candidateSourceService.js';
import authRouter from './auth.js';
import adminRouter from './admin.js';
import { authenticateToken } from '../middleware/auth.js';

// Configure multer to use memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit per file
  }
});

const router = express.Router();

// Mount public Auth routes
router.use('/auth', authRouter);

// Mount Admin routes
router.use('/admin', adminRouter);

// Protect all existing candidates and department routes below
router.use(authenticateToken);

// --- Candidates Routes ---
router.get('/candidates', async (req, res) => {
  try {
    const { data, mode } = await fetchCandidates();
    res.json({ success: true, candidates: data, mode });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/candidates/send', async (req, res) => {
  console.log("SEND ROUTE BODY:", req.body);
  try {
    const { email } = req.body;
    console.log('Backend received POST /candidates/send with body:', JSON.stringify(req.body));
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email parameter is required' });
    }
    const result = await sendJoiningLetterWorkflow(email);
    res.json(result);
  } catch (error) {
    console.error("SEND ROUTE ERROR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/candidates/reject', async (req, res) => {
  console.log("REJECT ROUTE BODY:", req.body);
  try {
    const { candidateEmail } = req.body;
    console.log('Backend received POST /candidates/reject with body:', JSON.stringify(req.body));
    if (!candidateEmail) {
      return res.status(400).json({ success: false, error: 'candidateEmail parameter is required' });
    }
    const result = await sendRejectionEmailWorkflow(candidateEmail);
    res.json(result);
  } catch (error) {
    console.error("REJECT ROUTE ERROR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/candidates/interview', async (req, res) => {
  console.log("INTERVIEW ROUTE BODY:", req.body);
  try {
    const { email } = req.body;
    console.log('Backend received POST /candidates/interview with body:', JSON.stringify(req.body));
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email parameter is required' });
    }
    const result = await sendInterviewEmailWorkflow(email);
    res.json(result);
  } catch (error) {
    console.error("INTERVIEW ROUTE ERROR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/candidates/status', async (req, res) => {
  try {
    const { email, status } = req.body;
    console.log('=== STATUS UPDATE REQUEST ===');
    console.log('Body received:', JSON.stringify(req.body));
    console.log('email:', email, '| status:', status);
    if (!email || !status) {
      console.log('ERROR: missing email or status');
      return res.status(400).json({ success: false, error: 'email and status parameters are required' });
    }
    const result = await updateCandidateStatus(email, status);
    console.log('STATUS UPDATE SUCCESS:', JSON.stringify(result));
    res.json(result);
  } catch (error) {
    console.error('=== STATUS UPDATE FAILED ===');
    console.error('Error message:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/candidates/repair', async (req, res) => {
  try {
    const result = await repairCandidatesWorkflow();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


async function getPreviewText(candidate) {
  return `Dear ${candidate.candidateName},\n\nWe are pleased to offer you the position of ${candidate.role} starting on ${candidate.joiningDate}.\n\nBest regards,\nDeepwoods Green HR`;
}

router.get('/candidates/preview', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email parameter is required' });
    }
    const candidate = await fetchCandidateByEmail(email);
    const previewText = await getPreviewText(candidate);
    res.json({
      success: true,
      candidate,
      previewText
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Departments & Candidate Ingestion Routes ---
router.get('/departments/:sheetName', async (req, res) => {
  try {
    const { sheetName } = req.params;
    const { data } = await fetchDepartmentCandidates(sheetName);
    res.json({ success: true, candidates: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/candidates', async (req, res) => {
  try {
    const { candidate, source } = req.body;
    if (!candidate) {
      return res.status(400).json({ success: false, error: 'Candidate data is required' });
    }
    const result = await ingestCandidate(candidate, source || 'Other');
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/resumes/process', async (req, res) => {
  try {
    const result = await triggerResumeProcessing();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/resumes/upload', upload.array('resumes'), async (req, res) => {
  try {
    const { departmentId, source } = req.body;
    const chosenSource = source || 'Website';
    const files = req.files;

    if (!departmentId) {
      return res.status(400).json({ success: false, error: 'departmentId is required' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files were uploaded' });
    }

    console.log(`[BACKEND] Received ${files.length} resume upload request for department: ${departmentId} with source: ${chosenSource}`);

    const results = [];
    const deptMap = {
      'sustainability': 'Sustainability',
      'ai-data-engineer': 'AI/Data Engineer',
      'web-developer': 'Web Developer',
      'marketing': 'Marketing',
      'creative': 'Creative',
      'others': 'Others'
    };
    const roleName = deptMap[departmentId] || 'Others';

    for (const file of files) {
      try {
        let extractedText = '';
        const ext = file.originalname.split('.').pop().toLowerCase();

        if (ext === 'pdf') {
          console.log(`[BACKEND] Extracting text from PDF: ${file.originalname}`);
          const parser = new PDFParse({ data: file.buffer });
          const pdfData = await parser.getText();
          extractedText = pdfData.text || '';
          await parser.destroy();
        } else if (ext === 'txt') {
          extractedText = file.buffer.toString('utf-8');
        } else if (ext === 'docx') {
          console.log(`[BACKEND] Extracting text from DOCX: ${file.originalname}`);
          const result = await mammoth.convertToMarkdown({ buffer: file.buffer });
          extractedText = result.value || '';
        } else {
          throw new Error(`Unsupported file format: .${ext}. Only PDF, DOCX, and TXT files are supported for instant parsing.`);
        }

        if (!extractedText.trim()) {
          throw new Error('Could not extract any text from the uploaded resume.');
        }

        // 1. Call Groq LLM to parse candidate details directly from backend
        console.log(`[BACKEND] Calling Groq LLM to parse details for: ${file.originalname}`);
        const parsedDetails = await parseResumeTextWithLLM(extractedText);
        console.log('[BACKEND] Extracted Details:', JSON.stringify(parsedDetails));

        // 2. Upload the original file directly to Google Drive (which now puts it in the Processed folder)
        console.log(`[BACKEND] Uploading ${file.originalname} to Google Drive...`);
        const driveResult = await uploadResumeToDrive(file.buffer, file.originalname, departmentId, chosenSource);

        // 3. Format details and ingest candidate to Google Sheets
        const candidateData = {
          candidateName: parsedDetails.name || file.originalname.split('.')[0],
          email: parsedDetails.email,
          role: roleName,
          phoneNumber: parsedDetails.phone,
          ug: parsedDetails.ug,
          pg: parsedDetails.pg,
          college: parsedDetails.college,
          location: parsedDetails.location || 'N/A',
          linkedin: parsedDetails.linkedin,
          github: parsedDetails.github,
          status: 'Submitted',
          emailStatus: 'Pending',
          source: chosenSource,
          resumeFileId: driveResult.fileId
        };

        console.log(`[BACKEND] Ingesting candidate to Google Sheets: ${candidateData.candidateName}`);
        await ingestCandidate(candidateData, chosenSource);

        results.push({
          fileName: file.originalname,
          success: true,
          fileId: driveResult.fileId,
          candidateName: candidateData.candidateName
        });
      } catch (fileErr) {
        console.error(`[BACKEND] Failed to parse/upload resume ${file.originalname}:`, fileErr);
        results.push({
          fileName: file.originalname,
          success: false,
          error: fileErr.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    res.json({
      success: successCount > 0,
      message: `Successfully processed ${successCount} of ${files.length} resume(s).`,
      results
    });
  } catch (error) {
    console.error('[BACKEND] Resume upload and parsing failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

