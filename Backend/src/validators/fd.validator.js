import { body } from 'express-validator';

export const calculateFDValidationRules = [
  body('principalAmount')
    .notEmpty()
    .withMessage('Principal amount is required'),
  body('interestRate')
    .notEmpty()
    .withMessage('Interest rate is required'),
  body('tenureMonths')
    .notEmpty()
    .withMessage('Tenure in months is required'),
];

export const bookFDValidationRules = [
  body('principalAmount')
    .notEmpty()
    .withMessage('Principal amount is required'),
  body('tenureMonths')
    .notEmpty()
    .withMessage('Tenure in months is required'),
  body('nominee.name')
    .trim()
    .notEmpty()
    .withMessage('Nominee name is required'),
  body('nominee.relationship')
    .trim()
    .notEmpty()
    .withMessage('Nominee relationship is required'),
  body('nominee.age')
    .notEmpty()
    .withMessage('Nominee age is required'),
  body('nominee.phone')
    .trim()
    .notEmpty()
    .withMessage('Nominee phone number is required'),
];
