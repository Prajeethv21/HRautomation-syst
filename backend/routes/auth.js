import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { 
  getUsers, getUserByEmail, createUser, createSession, deleteSession, createAuditLog 
} from '../services/dbService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'deepwoods-green-secret-key-1234567890';

// Helper to interact with Google Apps Script
async function triggerGasNotification(payload) {
  const url = process.env.VITE_APPS_SCRIPT_URL;
  const sheetId = process.env.VITE_GOOGLE_SHEET_ID;
  if (!url) {
    console.warn('[AUTH] VITE_APPS_SCRIPT_URL not configured. Skipping email.');
    return;
  }
  try {
    await axios.post(url, { ...payload, sheetId }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
  } catch (err) {
    console.error('[AUTH] Failed to trigger GAS notification:', err.message);
  }
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const allUsers = await getUsers();
    const isFirstUser = allUsers.length === 0;

    const newUser = {
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: isFirstUser ? 'ADMIN' : 'HR',
      status: isFirstUser ? 'APPROVED' : 'PENDING',
      expiryDate: null,
      createdAt: new Date().toISOString()
    };

    await createUser(newUser);

    // Write audit log
    await createAuditLog({
      id: Math.random().toString(36).substring(2, 9),
      userEmail: newUser.email,
      action: 'User Registration',
      timestamp: new Date().toISOString()
    });

    if (isFirstUser) {
      console.log(`[BOOTSTRAP] Auto-approved first user as ADMIN: ${newUser.email}`);
    } else {
      // Send notification to Admin
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@deepwoodsgreen.com';
      await triggerGasNotification({
        action: 'sendAdminNotification',
        adminEmail,
        name: newUser.name,
        email: newUser.email
      });
    }

    res.json({
      success: true,
      message: isFirstUser 
        ? 'Registration successful. First user bootstrapped as Admin.' 
        : 'Registration submitted. Awaiting Admin approval.'
    });
  } catch (error) {
    console.error('[AUTH] Registration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    // Verify status
    if (user.status !== 'APPROVED') {
      if (user.status === 'PENDING') {
        return res.status(403).json({ success: false, error: 'Your access request is pending Admin approval.' });
      }
      if (user.status === 'REJECTED') {
        return res.status(403).json({ success: false, error: 'Your access request was rejected. Please contact the administrator.' });
      }
      if (user.status === 'DISABLED') {
        return res.status(403).json({ success: false, error: 'Your account has been disabled. Please contact the administrator.' });
      }
    }

    // Verify expiry date
    if (user.expiryDate) {
      const expiry = new Date(user.expiryDate);
      const now = new Date();
      if (now > expiry) {
        return res.status(403).json({ success: false, error: 'Your ATS access has expired. Please contact the administrator.' });
      }
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    // Store session
    await createSession({
      id: Math.random().toString(36).substring(2, 15),
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    });

    // Write audit log
    await createAuditLog({
      id: Math.random().toString(36).substring(2, 9),
      userEmail: user.email,
      action: 'User Login',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        expiryDate: user.expiryDate
      }
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await deleteSession(req.token);

    // Write audit log
    await createAuditLog({
      id: Math.random().toString(36).substring(2, 9),
      userEmail: req.user.email,
      action: 'User Logout',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('[AUTH] Logout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

export default router;
