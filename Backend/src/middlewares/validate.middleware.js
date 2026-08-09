import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/apiResponse.js';

export const validate = (validations) => {
  return async (req, res, next) => {
    for (let validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return errorResponse(res, formattedErrors[0].message, 400, formattedErrors);
  };
};

export default validate;
