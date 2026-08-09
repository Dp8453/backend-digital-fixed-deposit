import { Router } from 'express';
import {
  getUserTransactions,
  getTransactionDetails,
  exportTransactionsCsv,
} from '../controllers/transaction.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getUserTransactions);
router.get('/export/csv', exportTransactionsCsv);
router.get('/:id', getTransactionDetails);

export default router;
