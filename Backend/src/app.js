import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import requestLogger from './middlewares/requestLogger.middleware.js';
import notFoundHandler from './middlewares/notFound.middleware.js';
import errorHandler from './middlewares/error.middleware.js';
import { authRateLimiter, apiRateLimiter } from './middlewares/rateLimiter.middleware.js';

import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import fdRoutes from './routes/fd.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import adminRoutes from './routes/admin.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import notificationRoutes from './routes/notification.routes.js';

dotenv.config();

const app = express();

// 1. Helmet Security Headers (HSTS, NoSniff, XSS Filter, Frameguard DENY)
app.use(
  helmet({
    contentSecurityPolicy: false, // Set to false if frontend assets loaded locally in dev
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Strict CORS Configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // 24 hours preflight cache
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 3. NoSQL Injection Sanitization (Strips $ and . from req.body, req.query, req.params)
app.use(mongoSanitize());

app.use(requestLogger);

// Silence favicon 404 noise
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 4. Rate Limiting Middleware
app.use('/api/v1/auth', authRateLimiter);
app.use('/api/v1', apiRateLimiter);

// Mount API v1 Routes
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/fixed-deposits', fdRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Digital Fixed Deposit System API',
    version: '1.0.0',
    status: 'Active & Secured',
    documentation: '/api/v1/health',
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
