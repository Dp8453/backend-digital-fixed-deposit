import FDService from '../services/fd.service.js';
import { successResponse } from '../utils/apiResponse.js';

export const calculateInterest = async (req, res, next) => {
  try {
    const result = await FDService.calculateProjections(req.body);
    return successResponse(res, 'FD interest and maturity calculated successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

export const bookFD = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const newFD = await FDService.bookFixedDeposit(userId, req.body);
    return successResponse(res, 'Fixed Deposit booked successfully', newFD, 201);
  } catch (error) {
    next(error);
  }
};

export const getUserPortfolio = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;
    const data = await FDService.getUserPortfolio(userId, status || null);
    return successResponse(res, 'User Fixed Deposit portfolio retrieved successfully', data, 200);
  } catch (error) {
    next(error);
  }
};

export const getFDDetails = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const data = await FDService.getFDDetails(id, userId);
    return successResponse(res, 'Fixed Deposit details retrieved successfully', data, 200);
  } catch (error) {
    next(error);
  }
};

export const simulatePrematureBreak = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const data = await FDService.simulatePrematureBreak(id, userId);
    return successResponse(res, 'Premature withdrawal calculation breakdown', data, 200);
  } catch (error) {
    next(error);
  }
};

export const breakFD = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const result = await FDService.processPrematureBreak(id, userId);
    return successResponse(res, 'Fixed Deposit closed prematurely successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

export const getFDSchemes = async (req, res, next) => {
  try {
    const schemes = await FDService.getSchemes();
    return successResponse(res, 'Fixed Deposit investment schemes retrieved', schemes, 200);
  } catch (error) {
    next(error);
  }
};
