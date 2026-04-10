const mongoose = require('mongoose');

// 条件必填验证器：只有当 isDraft 为 false 时才验证必填
function requiredIfNotDraft(message) {
  return {
    validator: function(value) {
      // 如果是草稿，不验证必填
      if (this.isDraft) {
        return true;
      }
      // 非草稿时，值必须存在
      return value !== null && value !== undefined && value !== '';
    },
    message: message
  };
}

// 数字类型的条件必填验证器
function requiredNumberIfNotDraft(message) {
  return {
    validator: function(value) {
      if (this.isDraft) {
        return true;
      }
      return value !== null && value !== undefined;
    },
    message: message
  };
}

// 布尔类型的条件必填验证器
function requiredBooleanIfNotDraft(message) {
  return {
    validator: function(value) {
      if (this.isDraft) {
        return true;
      }
      return value !== null && value !== undefined;
    },
    message: message
  };
}

// ObjectId类型的条件必填验证器
function requiredObjectIdIfNotDraft(message) {
  return {
    validator: function(value) {
      if (this.isDraft) {
        return true;
      }
      return value !== null && value !== undefined;
    },
    message: message
  };
}

const customerSchema = new mongoose.Schema({
  // 基本信息
  customerName: {
    type: String,
    validate: requiredIfNotDraft('客户姓名为必填项')
  },
  idCard: {
    type: String,
    validate: requiredIfNotDraft('身份证为必填项')
  },
  licensePlate: String,
  frameNumber: {
    type: String,
    validate: requiredIfNotDraft('车架号为必填项')
  },
  carBrand: {
    type: String,
    validate: requiredIfNotDraft('车品牌为必填项')
  },
  customerAddress: {
    type: String,
    validate: requiredIfNotDraft('客户地址为必填项')
  },
  customerPhone: String,
  salesmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: requiredObjectIdIfNotDraft('业务员为必填项')
  },
  salesmanPhone: String,
  archiveReceiver: {
    type: String,
    validate: requiredIfNotDraft('档案收取员为必填项')
  },
  customerSource: {
    type: String,
    validate: requiredIfNotDraft('客户来源为必填项')
  },
  channelName: String,
  channelPhone: String,
  bankName: {
    type: String,
    validate: requiredIfNotDraft('开户行为必填项')
  },
  bankCardNumber: {
    type: String,
    validate: requiredIfNotDraft('银行卡号为必填项')
  },

  // 车辆信息
  assessmentAmount: {
    type: Number,
    validate: requiredNumberIfNotDraft('评估金额为必填项')
  },
  isMortgage: {
    type: Boolean,
    validate: requiredBooleanIfNotDraft('是否按揭为必填项')
  },
  collectionAmount: {
    type: Number,
    validate: requiredNumberIfNotDraft('收车金额为必填项')
  },
  collectionPlan: {
    type: String,
    validate: requiredIfNotDraft('收车方案为必填项')
  },
  trialCalculation: String,
  monthlyRepayment: Number,  // 每期应还金额
  isCollected: {
    type: String,
    enum: ['未入库', '已入库', ''],
    validate: requiredIfNotDraft('是否收车为必填项')
  },
  collector: {
    type: String,
    validate: requiredIfNotDraft('收车人为必填项')
  },
  applicationTime: Date,
  expectedSaleTime: Date,

  // 状态
  status: {
    type: String,
    enum: ['pending', 'stored', 'overdue', 'completed'],
    default: 'pending'
  },
  isOverdue: {
    type: Boolean,
    default: false
  },
  overdueDays: {
    type: Number,
    default: 0
  },
  overdueReason: String,
  completedAt: Date,  // 结清时间

  // 影像资料
  images: {
    idCardPhotos: [String],
    drivingLicense: [String],
    fullPaymentPhoto: [String],
    trafficViolation: [String],
    assessmentScreenshot: [String],
    transferScreenshot: [String],
    mileagePhoto: [String],
    vehicleArchive: [String],
    executionQuery: [String],
    contractPhoto: [String],
    otherPhotos: [String],
    storagePhotos: [String],
    voucherPhotos: [String]  // 放款凭证
  },

  isDraft: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// 索引
customerSchema.index({ salesmanId: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ isOverdue: 1 });
customerSchema.index({ isDraft: 1 });
customerSchema.index({ customerName: 'text', idCard: 'text', licensePlate: 'text', frameNumber: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
