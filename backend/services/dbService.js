import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ORIGINAL_DB_FILE = path.join(__dirname, '..', 'database.json');
const DB_FILE = process.env.VERCEL 
  ? path.join('/tmp', 'database.json') 
  : ORIGINAL_DB_FILE;

// Initialize database file if it doesn't exist
async function initDb() {
  try {
    await fs.access(DB_FILE);
  } catch (error) {
    if (process.env.VERCEL) {
      // On Vercel, copy the original database.json from the read-only package bundle to /tmp
      try {
        const originalContent = await fs.readFile(ORIGINAL_DB_FILE, 'utf-8');
        await fs.writeFile(DB_FILE, originalContent, 'utf-8');
        console.log('[DB] Successfully initialized database.json in /tmp');
        return;
      } catch (copyErr) {
        console.error('[DB] Failed to copy database.json to /tmp, fallback to empty:', copyErr);
      }
    }
    const initialData = {
      users: [],
      sessions: [],
      auditLogs: []
    };
    await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

// Queue for serializing write requests (prevents concurrent write corruptions)
let writeQueue = Promise.resolve();

async function readData() {
  await initDb();
  try {
    const content = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to read database file, returning empty state:', error);
    return { users: [], sessions: [], auditLogs: [] };
  }
}

async function writeData(data) {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(async () => {
      try {
        const tempFile = `${DB_FILE}.tmp`;
        await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
        await fs.rename(tempFile, DB_FILE);
        resolve();
      } catch (error) {
        console.error('Failed to write database file:', error);
        reject(error);
      }
    });
  });
}

// User methods
export async function getUsers() {
  const data = await readData();
  return data.users;
}

export async function getUserById(id) {
  const users = await getUsers();
  return users.find(u => u.id === id);
}

export async function getUserByEmail(email) {
  const users = await getUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export async function createUser(user) {
  const data = await readData();
  data.users.push(user);
  await writeData(data);
  return user;
}

export async function updateUser(id, updates) {
  const data = await readData();
  const index = data.users.findIndex(u => u.id === id);
  if (index === -1) throw new Error(`User with id ${id} not found`);
  
  data.users[index] = { ...data.users[index], ...updates };
  await writeData(data);
  return data.users[index];
}

// Session methods
export async function getSessions() {
  const data = await readData();
  return data.sessions;
}

export async function createSession(session) {
  const data = await readData();
  data.sessions.push(session);
  await writeData(data);
  return session;
}

export async function deleteSession(token) {
  const data = await readData();
  data.sessions = data.sessions.filter(s => s.token !== token);
  await writeData(data);
}

export async function deleteUserSessions(userId) {
  const data = await readData();
  data.sessions = data.sessions.filter(s => s.userId !== userId);
  await writeData(data);
}

export async function getSessionByToken(token) {
  const sessions = await getSessions();
  return sessions.find(s => s.token === token);
}

// Audit log methods
export async function getAuditLogs() {
  const data = await readData();
  return data.auditLogs;
}

export async function createAuditLog(log) {
  const data = await readData();
  data.auditLogs.push(log);
  await writeData(data);
  return log;
}
