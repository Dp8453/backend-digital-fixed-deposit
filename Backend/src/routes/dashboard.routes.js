import { Router } from 'express';
import { getCustomerDashboardStats } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.get('/stats', getCustomerDashboardStats);

export default router;
