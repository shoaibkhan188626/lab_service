import mongoose from 'mongoose';

const labSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: [true, 'Booking ID is required'],
      unique: true,
      default: () => require('crypto').randomUUID(),
    },

    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
      trim: true,
    },

    labId: {
      type: String,
      required: [true, 'Lab ID is required'],
      trim: true,
    },

    doctorId: {
      type: String,
      trim: true,
      default: null,
    },

    testType: {
      type: String,
      required: [true, 'Test type is required'],
      enum: {
        values: [
          'blood_test',
          'x_ray',
          'mri',
          'ultrasound',
          'ct_scan',
          'urine_test',
          'other',
        ],
        message: '{VALUE} is not defined',
      },
      trim: true,
    },

    date: {
      type: Date,
      required: [true, 'Test date is required'],
    },

    duration: {
      type: Number,
      default: 30,
      required: [true, 'Test date is required'],
    },

    status: {
      type: String,
      enum: {
        values: ['scheduled', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid status',
      },
      default: 'scheduled',
    },

    consent: {
      given: {
        type: Boolean,
        required: [true, 'Consent given is required'],
      },
      purpose: {
        type: String,
        required: [true, 'Consent purpose is required'],
        enum: ['lab_test', 'treatment', 'research'],
      },
      grantedAt: {
        type: Date,
        default: Date.now(),
      },
    },

    notes: {
      type: String,
      trim: true,
      maxLength: [500, 'Notes cannot exceed 500 characters'],
    },

    priority: {
      type: String,
      enum: ['normal', 'urgent'],
      default: 'normal',
    },

    deleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: String,
      required: [true, 'Created by is required'],
      trim: true,
    },

    updatedBy: {
      type: String,
      required: [true, 'updated by is required'],
      trim: true,
    },

    results: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    appointmentId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

(labSchema.index({ bookingId: 1 }),
labSchema.index({ patientId: 1, date: 1 }),
labSchema.index({ labId: 1, date: 1 }));

labSchema.pre('save', async function (next) {
  try {
    const axios = require('axios');
    await axios.get(
      `${process.env.USER_SERVICE_URL}/api/v1/users${this.patientId}`,
      { headers: { Authorization: `Bearer ${process.env.SERVICE_KEY}` } }
    );
    if (this.doctorId) {
      const response = await axios.get(
        `${process.env.USER_SERVICE_URL}/api/v1/kyc/status/${this.doctorId}`,
        { headers: { Authorization: `Bearer ${process.env.SERVICE_KEY}` } }
      );
      if (response.data.dat.status !== 'verified') {
        throw new Error('Doctor KYC not verified');
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

labSchema.methods.softDelete = async function () {
  this.deleted = true;
  this.deletedAt = new Date();
  this.status = 'cancelled';
  await this.save();
};

export default mongoose.model('Lab', labSchema);
