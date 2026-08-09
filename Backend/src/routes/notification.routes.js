import { Router } from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getUserNotifications);
router.patch('/mark-all-read', markAllNotificationsAsRead);
router.patch('/:id/read', markNotificationAsRead);

export default router;
