import express from 'express';
import multer from 'multer';
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
  uploadResumeToDrive
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
    const { departmentId } = req.body;
    const files = req.files;

    if (!departmentId) {
      return res.status(400).json({ success: false, error: 'departmentId is required' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files were uploaded' });
    }

    console.log(`[BACKEND] Received ${files.length} resume upload request for department: ${departmentId}`);

    const results = [];
    for (const file of files) {
      const result = await uploadResumeToDrive(file.buffer, file.originalname, departmentId);
      results.push({
        fileName: file.originalname,
        success: true,
        fileId: result.fileId
      });
    }

    res.json({
      success: true,
      message: `Successfully uploaded ${files.length} resume(s) to Google Drive.`,
      results
    });
  } catch (error) {
    console.error('[BACKEND] Resume upload failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

