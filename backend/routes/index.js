import express from 'express';
import {
  fetchCandidates,
  fetchCandidateByEmail,
  sendJoiningLetterWorkflow,
  sendRejectionEmailWorkflow,
  updateCandidateStatus
} from '../services/candidateService.js';

const router = express.Router();

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

export default router;

