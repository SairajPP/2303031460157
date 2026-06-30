import express from 'express';
import cors from 'cors';
import { Log, setLogToken } from 'logging-middleware';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize the log token for the backend
if (process.env.VITE_API_TOKEN) {
  setLogToken(process.env.VITE_API_TOKEN);
}

// Global request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    Log('backend', 'info', 'route', `Handled ${req.method} ${req.originalUrl} - ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Basic health route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Start server
app.listen(PORT, () => {
  Log('backend', 'info', 'config', `Server started successfully on port ${PORT}`);
  console.log(`Notification Backend running on port ${PORT}`);
});
