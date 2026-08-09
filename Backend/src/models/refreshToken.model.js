import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: [true, 'Refresh token string is required'],
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    deviceInfo: {
      ip: { type: String, default: '' },
      userAgent: { type: String, default: '' },
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: { expires: 0 }, // Auto delete document upon expiry
    },
  },
  {
    timestamps: true,
  }
);

refreshTokenSchema.index({ user: 1, isRevoked: 1 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
