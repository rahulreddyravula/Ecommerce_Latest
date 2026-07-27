import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    deviceFingerprint: {
      type: String,
      required: true
    },
    ipAddress: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    isRevoked: {
      type: Boolean,
      default: false,
      required: true
    },
    replacedByToken: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// MongoDB TTL index to automatically delete expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model('Session', sessionSchema);
export default Session;
