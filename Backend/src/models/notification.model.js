import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification body message is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: [
          'SYSTEM',
          'SECURITY',
          'FD_MATURITY',
          'INTEREST_CREDIT',
          'TICKET_UPDATE',
          'SUPPORT_TICKET_ALERT',
          'GENERAL_ALERT',
        ],
        message: 'Invalid notification type',
      },
      default: 'SYSTEM',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    link: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
