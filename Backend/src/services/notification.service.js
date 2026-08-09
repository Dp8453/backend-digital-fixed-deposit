import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import { emitRealTimeNotification } from '../socket/socket.js';
import logger from '../utils/logger.js';

class NotificationService {
  async createNotification(userId, title, message, type = 'GENERAL_ALERT', relatedEntity = null) {
    try {
      const notification = await Notification.create({
        user: userId,
        title,
        message,
        type,
        relatedEntity,
        isRead: false,
      });

      // Emit Real-Time Socket.IO event to client
      emitRealTimeNotification(userId, notification);

      logger.info(`🔔 Notification generated for User [${userId}]: ${title}`);
      return notification;
    } catch (err) {
      logger.error('Failed to create notification: ' + err.message);
    }
  }

  async notifyAdmins(title, message, type = 'SUPPORT_TICKET_ALERT', relatedEntity = null) {
    try {
      const admins = await User.find({ role: 'ADMIN' }).select('_id');
      const notifications = await Promise.all(
        admins.map((admin) => this.createNotification(admin._id, title, message, type, relatedEntity))
      );
      return notifications;
    } catch (err) {
      logger.error('Failed to notify admins: ' + err.message);
    }
  }

  async getUserNotifications(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [notifications, totalRecords, unreadCount] = await Promise.all([
      Notification.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Notification.countDocuments({ user: userId }),
      Notification.countDocuments({ user: userId, isRead: false }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit) || 1,
      },
    };
  }

  async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  async markAllAsRead(userId) {
    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return true;
  }
}

export default new NotificationService();
