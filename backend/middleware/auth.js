import jwt from 'jsonwebtoken';
import { getUserById, getSessionByToken } from '../services/dbService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'deepwoods-green-secret-key-1234567890';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token is required' });
  }

  try {
    // 1. Verify JWT signature
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 2. Verify session is still active in DB (revocation/logout invalidates this)
    const session = await getSessionByToken(token);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Session has expired or been revoked' });
    }

    // 3. Fetch user and check status and expiry
    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User no longer exists' });
    }

    if (user.status !== 'APPROVED') {
      return res.status(403).json({ success: false, error: `Your account is ${user.status.toLowerCase()}` });
    }

    if (user.expiryDate) {
      const expiry = new Date(user.expiryDate);
      const now = new Date();
      if (now > expiry) {
        return res.status(403).json({ success: false, error: 'Your ATS access has expired. Please contact the administrator.' });
      }
    }

    // Pass user details to request object
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    };
    req.token = token;

    next();
  } catch (error) {
    console.error('JWT authentication error:', error.message);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Administrator access required' });
  }
  next();
}
