import NotificationService from '../services/notification.service.js';
import { successResponse } from '../utils/apiResponse.js';

export const getUserNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const result = await NotificationService.getUserNotifications(userId, Number(page), Number(limit));
    return successResponse(res, 'User notifications retrieved', result, 200);
  } catch (error) {
    next(error);
  }
};

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const notification = await NotificationService.markAsRead(id, userId);
    return successResponse(res, 'Notification marked as read', notification, 200);
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await NotificationService.markAllAsRead(userId);
    return successResponse(res, 'All notifications marked as read', null, 200);
  } catch (error) {
    next(error);
  }
};
