import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['USER', 'CUSTOMER', 'ADMIN'],
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Message body cannot be empty'],
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: [true, 'Ticket ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    category: {
      type: String,
      enum: {
        values: [
          'GENERAL_QUERY',
          'FD_BOOKING',
          'FD_QUERY',
          'INTEREST_RATE',
          'MATURITY_ISSUE',
          'MATURITY_PAYOUT',
          'PREMATURE_WITHDRAWAL',
          'PREMATURE_BREAK',
          'TECHNICAL_GLITCH',
          'TECHNICAL_SUPPORT',
          'SECURITY',
        ],
        message: 'Invalid ticket category',
      },
      default: 'GENERAL_QUERY',
    },
    priority: {
      type: String,
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        message: 'Invalid priority level',
      },
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: {
        values: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
        message: 'Invalid ticket status',
      },
      default: 'OPEN',
      index: true,
    },
    messages: [messageSchema],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

supportTicketSchema.index({ user: 1, status: 1 });

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
export default SupportTicket;
