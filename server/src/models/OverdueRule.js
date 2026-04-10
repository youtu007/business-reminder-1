const mongoose = require('mongoose');

const overdueRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  condition: {
    field: {
      type: String,
      required: true
    },
    operator: {
      type: String,
      enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'],
      required: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  daysThreshold: {
    type: Number,
    required: true
  },
  reminderEnabled: {
    type: Boolean,
    default: true
  },
  reminderTime: {
    type: String,
    default: '09:00'
  },
  unassignedAction: {
    type: String,
    enum: ['none', 'admin'],
    default: 'admin'
  },
  reminderInterval: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('OverdueRule', overdueRuleSchema);
