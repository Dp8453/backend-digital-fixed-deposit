import { Router } from 'express';
import {
  getAdminStats,
  getAllUsers,
  updateUserStatus,
  getAllFixedDeposits,
} from '../controllers/admin.controller.js';
import { getAllTickets } from '../controllers/ticket.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Strict Admin RBAC enforcement on all routes
router.use(authenticate, authorize('ADMIN'));

router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.patch('/users/:id/status', updateUserStatus);
router.get('/fixed-deposits', getAllFixedDeposits);
router.get('/tickets', getAllTickets);

export default router;
