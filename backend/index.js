import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import apiRoutes from './routes/index.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend development server
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Serve frontend in production environment
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

// Fallback to index.html for React SPA Router (production only)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      // If index.html isn't built yet (development mode)
      res.status(200).send('Deepwoods Green Automation API is running. Build frontend to view interface.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Deepwoods Green HR Automation Server Running!`);
  console.log(`  Local Endpoint: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
// reload trigger 4
