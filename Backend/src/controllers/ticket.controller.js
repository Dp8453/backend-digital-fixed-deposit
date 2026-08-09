import SupportTicket from '../models/supportTicket.model.js';
import NotificationService from '../services/notification.service.js';
import { successResponse } from '../utils/apiResponse.js';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';

// Customer: File support ticket
export const createSupportTicket = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { subject, category, priority, message } = req.body;

    if (!subject || !message) {
      throw new AppError('Subject and message are required.', 400);
    }

    const ticketId = `TICK${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

    const ticket = await SupportTicket.create({
      ticketId,
      user: userId,
      subject,
      category: category || 'GENERAL_QUERY',
      priority: priority || 'MEDIUM',
      status: 'OPEN',
      messages: [
        {
          sender: userId,
          senderRole: req.user.role,
          message,
        },
      ],
    });

    // Notify Admins
    await NotificationService.notifyAdmins(
      `New Support Ticket #${ticketId}`,
      `Customer ${req.user.firstName} submitted ticket: "${subject}"`,
      'SUPPORT_TICKET_ALERT'
    );

    // Notify Customer confirmation
    await NotificationService.createNotification(
      userId,
      `Support Ticket #${ticketId} Opened`,
      `Your support ticket regarding "${subject}" has been received. Our team will respond shortly.`,
      'SUPPORT_TICKET_ALERT'
    );

    logger.info(`🎫 Support Ticket Created: [${ticketId}] by User: [${userId}]`);
    return successResponse(res, 'Support ticket submitted successfully', ticket, 201);
  } catch (error) {
    next(error);
  }
};

// Customer: Get user's support tickets
export const getUserTickets = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const tickets = await SupportTicket.find({ user: userId }).sort({ createdAt: -1 }).exec();
    return successResponse(res, 'User support tickets retrieved', tickets, 200);
  } catch (error) {
    next(error);
  }
};

// Get single ticket details and conversation thread
export const getTicketDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = req.user.role === 'ADMIN' ? { _id: id } : { _id: id, user: req.user._id };

    const ticket = await SupportTicket.findOne(query)
      .populate('user', 'firstName lastName email role')
      .populate('messages.sender', 'firstName lastName email role')
      .exec();

    if (!ticket) {
      throw new AppError('Support ticket not found or access denied.', 404);
    }

    return successResponse(res, 'Ticket conversation thread retrieved', ticket, 200);
  } catch (error) {
    next(error);
  }
};

// Reply to ticket (Customer or Admin)
export const replyToTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, status } = req.body;

    if (!message && !status) {
      throw new AppError('Reply message or status update required.', 400);
    }

    const query = req.user.role === 'ADMIN' ? { _id: id } : { _id: id, user: req.user._id };
    const ticket = await SupportTicket.findOne(query);

    if (!ticket) {
      throw new AppError('Support ticket not found or access denied.', 404);
    }

    if (message) {
      ticket.messages.push({
        sender: req.user._id,
        senderRole: req.user.role,
        message,
      });
    }

    const oldStatus = ticket.status;
    if (status) {
      ticket.status = status;
    } else if (req.user.role === 'ADMIN' && ticket.status === 'OPEN') {
      ticket.status = 'IN_PROGRESS';
    }

    await ticket.save();

    // Trigger Notification
    if (req.user.role === 'ADMIN') {
      await NotificationService.createNotification(
        ticket.user,
        `Bank Support Replied to #${ticket.ticketId}`,
        status ? `Your support ticket #${ticket.ticketId} was marked as ${status}.` : `Bank Support replied: "${message?.substring(0, 60)}..."`,
        'SUPPORT_TICKET_ALERT'
      );
    } else {
      await NotificationService.notifyAdmins(
        `Customer Replied to Ticket #${ticket.ticketId}`,
        `Customer replied: "${message?.substring(0, 60)}..."`,
        'SUPPORT_TICKET_ALERT'
      );
    }

    logger.info(`💬 Reply added to Ticket [${ticket.ticketId}] by [${req.user.email}]`);
    return successResponse(res, 'Reply added to support ticket', ticket, 200);
  } catch (error) {
    next(error);
  }
};

// Admin: Get all tickets across system
export const getAllTickets = async (req, res, next) => {
  try {
    const { status, priority, category, search, page = 1, limit = 10 } = req.query;
    const p = Number(page) || 1;
    const l = Number(limit) || 10;
    const skip = (p - 1) * l;

    const query = {};
    if (status && status !== 'ALL') query.status = status;
    if (priority && priority !== 'ALL') query.priority = priority;
    if (category && category !== 'ALL') query.category = category;
    if (search) query.subject = { $regex: search, $options: 'i' };

    const [tickets, totalRecords] = await Promise.all([
      SupportTicket.find(query)
        .populate('user', 'firstName lastName email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(l)
        .exec(),
      SupportTicket.countDocuments(query),
    ]);

    return successResponse(res, 'All support tickets retrieved', {
      tickets,
      pagination: {
        page: p,
        limit: l,
        totalRecords,
        totalPages: Math.ceil(totalRecords / l) || 1,
      },
    }, 200);
  } catch (error) {
    next(error);
  }
};
