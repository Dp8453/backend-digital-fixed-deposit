import { Router } from 'express';
import {
  createSupportTicket,
  getUserTickets,
  getTicketDetails,
  replyToTicket,
} from '../controllers/ticket.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', createSupportTicket);
router.get('/', getUserTickets);
router.get('/:id', getTicketDetails);
router.post('/:id/reply', replyToTicket);

export default router;
