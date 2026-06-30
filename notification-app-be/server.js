import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Logger, requestLogger } from 'logging-middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const logger = new Logger('BackendServer');

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger); // Use our custom logging middleware

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  logger.info('Health check endpoint called');
  res.status(200).json({ status: 'ok', message: 'Notification API is running' });
});

app.listen(PORT, () => {
  logger.info(`Server is starting...`);
  logger.info(`Backend listening on port ${PORT}`);
});
