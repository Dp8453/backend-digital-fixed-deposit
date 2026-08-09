import { Router } from 'express';
import {
  calculateInterest,
  bookFD,
  getUserPortfolio,
  getFDDetails,
  simulatePrematureBreak,
  breakFD,
  getFDSchemes,
} from '../controllers/fd.controller.js';
import { calculateFDValidationRules, bookFDValidationRules } from '../validators/fd.validator.js';
import validate from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Calculation & Scheme routes (Public / Auth)
router.post('/calculate', validate(calculateFDValidationRules), calculateInterest);
router.get('/schemes', getFDSchemes);

// Protected User FD routes
router.use(authenticate);

router.post('/book', validate(bookFDValidationRules), bookFD);
router.get('/my-portfolio', getUserPortfolio);
router.get('/:id', getFDDetails);
router.post('/:id/simulate-break', simulatePrematureBreak);
router.post('/:id/break', breakFD);

export default router;
