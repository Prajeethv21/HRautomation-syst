import express from 'express';
import axios from 'axios';
import { 
  getUsers, getUserById, updateUser, getAuditLogs, createAuditLog, deleteUserSessions 
} from '../services/dbService.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply admin protection to all routes in this router
router.use(authenticateToken, requireAdmin);

// Helper to interact with Google Apps Script
async function triggerGasNotification(payload) {
  const url = process.env.VITE_APPS_SCRIPT_URL;
  const sheetId = process.env.VITE_GOOGLE_SHEET_ID;
  if (!url) {
    console.warn('[ADMIN] VITE_APPS_SCRIPT_URL not configured. Skipping email.');
    return;
  }
  try {
    await axios.post(url, { ...payload, sheetId }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
  } catch (err) {
    console.error('[ADMIN] Failed to trigger GAS notification:', err.message);
  }
}

// GET /api/admin/users/pending
router.get('/users/pending', async (req, res) => {
  try {
    const users = await getUsers();
    const pendingUsers = users.filter(u => u.status === 'PENDING' && u.role !== 'ADMIN');
    res.json({ success: true, users: pendingUsers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/users/all
router.get('/users/all', async (req, res) => {
  try {
    const users = await getUsers();
    // Return all HR users (approved, disabled, rejected)
    const hrUsers = users.filter(u => u.role === 'HR');
    res.json({ success: true, users: hrUsers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/users/approve
router.post('/users/approve', async (req, res) => {
  try {
    const { userId, expiryDays, customExpiryDate } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    let expiryDate = null;
    if (expiryDays === 30) {
      expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (expiryDays === 90) {
      expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    } else if (customExpiryDate) {
      expiryDate = new Date(customExpiryDate).toISOString();
    } else {
      return res.status(400).json({ success: false, error: 'Access expiry date is required' });
    }

    const updatedUser = await updateUser(userId, {
      status: 'APPROVED',
      expiryDate
    });

    // Write audit log
    await createAuditLog({
      id: Math.random().toString(36).substring(2, 9),
      userEmail: user.email,
      action: 'User Approval',
      timestamp: new Date().toISOString()
    });

    // Send approval notification email
    const formattedExpiry = new Date(expiryDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    await triggerGasNotification({
      action: 'sendUserApproval',
      userEmail: user.email,
      name: user.name,
      expiryDate: formattedExpiry
    });

    res.json({ success: true, message: 'User approved successfully', user: updatedUser });
  } catch (error) {
    console.error('[ADMIN] Approval error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/users/reject
router.post('/users/reject', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updatedUser = await updateUser(userId, { status: 'REJECTED' });

    // Write audit log
    await createAuditLog({
      id: Math.random().toString(36).substring(2, 9),
      userEmail: user.email,
      action: 'User Rejection',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'User request rejected', user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/users/disable
router.post('/users/disable', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updatedUser = await updateUser(userId, { status: 'DISABLED' });

    // Invalidate sessions immediately in DB
    await deleteUserSessions(userId);

    // Write audit log
    await createAuditLog({
      id: Math.random().toString(36).substring(2, 9),
      userEmail: user.email,
      action: 'User Disable',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'User account disabled and active sessions revoked', user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/users/enable
router.post('/users/enable', async (req, res) => {
  try {
    const { userId, expiryDays, customExpiryDate } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    let expiryDate = null;
    if (expiryDays === 30) {
      expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (expiryDays === 90) {
      expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    } else if (customExpiryDate) {
      expiryDate = new Date(customExpiryDate).toISOString();
    } else {
      return res.status(400).json({ success: false, error: 'Access expiry date is required' });
    }

    const updatedUser = await updateUser(userId, {
      status: 'APPROVED',
      expiryDate
    });

    // Write audit log
    await createAuditLog({
      id: Math.random().toString(36).substring(2, 9),
      userEmail: user.email,
      action: 'User Enable',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'User re-enabled successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await getAuditLogs();
    // Sort desc by timestamp
    const sortedLogs = [...logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    res.json({ success: true, logs: sortedLogs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
