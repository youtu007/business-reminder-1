const mongoose = require('mongoose');

const assignmentLogSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  fromSalesmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  toSalesmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  operatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  remark: String
}, {
  timestamps: true
});

assignmentLogSchema.index({ customerId: 1 });

module.exports = mongoose.model('AssignmentLog', assignmentLogSchema);
