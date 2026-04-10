const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['overdue', 'repayment_due', 'repayment_overdue'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  overdueReason: {
    type: String
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

notificationLogSchema.index({ customerId: 1, userId: 1, type: 1, overdueReason: 1 });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
