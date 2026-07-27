import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [12, 'Password must be at least 12 characters long'], // NIST standard
      select: false // Do not expose password by default
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number (E.164 format)']
    },
    avatar: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      enum: {
        values: ['User', 'Admin'],
        message: 'Role must be either User or Admin'
      },
      default: 'User'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'blocked'],
        message: 'Status must be active or blocked'
      },
      default: 'active'
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    otp: String,
    otpExpire: Date,
    otpAttempts: {
      type: Number,
      default: 0
    },
    // Enterprise Security Fields
    passwordHistory: {
      type: [String],
      select: false,
      default: []
    },
    loginAttempts: {
      type: Number,
      default: 0,
      required: true
    },
    lockUntil: {
      type: Date
    },
    isMfaEnabled: {
      type: Boolean,
      default: false,
      required: true
    },
    mfaSecret: {
      type: String,
      select: false
    },
    verificationToken: {
      type: String,
      select: false
    },
    verificationTokenExpires: {
      type: Date,
      select: false
    },
    emailOtp: {
      type: String,
      select: false
    },
    emailOtpExpires: {
      type: Date,
      select: false
    },
    emailOtpAttempts: {
      type: Number,
      default: 0,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(12); // Strong work factor
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
