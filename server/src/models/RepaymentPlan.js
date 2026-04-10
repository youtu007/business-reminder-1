const mongoose = require('mongoose');

const repaymentPlanSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  period: {
    type: Number,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  expectedAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  actualAmount: {
    type: Number,
    default: null
  },
  interest: {
    type: Number,
    default: 0
  },
  overdueDays: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  paidAt: {
    type: Date,
    default: null
  },
  remark: {
    type: String
  }
}, {
  timestamps: true
});

repaymentPlanSchema.index({ customerId: 1, period: 1 }, { unique: true });
repaymentPlanSchema.index({ customerId: 1, status: 1 });
repaymentPlanSchema.index({ status: 1, dueDate: 1 });

module.exports = mongoose.model('RepaymentPlan', repaymentPlanSchema);
