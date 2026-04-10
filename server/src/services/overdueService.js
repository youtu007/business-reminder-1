const cron = require('node-cron');
const Customer = require('../models/Customer');
const OverdueRule = require('../models/OverdueRule');
const RepaymentPlan = require('../models/RepaymentPlan');
const User = require('../models/User');
const NotificationLog = require('../models/NotificationLog');
const { sendSubscriptionMessage } = require('./wechatService');
const logger = require('../utils/logger');

// 检查逾期（主入口）
async function checkOverdue() {
  try {
    // 1) 基于 OverdueRule 的客户级逾期判定
    const rules = await OverdueRule.find({ isActive: true });

    for (const rule of rules) {
      const query = {
        status: { $ne: 'completed' }
      };

      const customers = await Customer.find(query).populate('salesmanId', 'name phone openid');

      for (const customer of customers) {
        const shouldMarkOverdue = evaluateRule(customer, rule);

        if (shouldMarkOverdue && !customer.isOverdue) {
          customer.isOverdue = true;
          customer.overdueReason = rule.name;
          customer.status = 'overdue';
          await customer.save();
          logger.info('客户标记为逾期', { customer: customer.customerName, rule: rule.name });
        }

        // 发送通知（应用间隔逻辑）
        if (customer.isOverdue) {
          await sendNotificationWithInterval(customer, rule, 'overdue', rule.name);
        }
      }
    }

    // 2) 基于还款计划的逾期检查 + 逾期天数累计
    await checkRepaymentOverdue();

    // 3) 恢复已不再逾期的客户
    await recoverCustomers();

    logger.info('逾期检查完成');
  } catch (error) {
    logger.error('逾期检查错误', { error: error.message });
  }
}

// 评估规则
function evaluateRule(customer, rule) {
  const { condition, daysThreshold } = rule;
  const { field, operator, value } = condition;

  let fieldValue = customer[field];

  // 日期类型特殊处理
  if (fieldValue instanceof Date) {
    const now = new Date();
    const diffDays = Math.floor((now - fieldValue) / (1000 * 60 * 60 * 24));

    switch (operator) {
      case 'gt': return diffDays > daysThreshold;
      case 'gte': return diffDays >= daysThreshold;
      case 'lt': return diffDays < daysThreshold;
      case 'lte': return diffDays <= daysThreshold;
      default: return false;
    }
  }

  switch (operator) {
    case 'eq': return fieldValue === value;
    case 'ne': return fieldValue !== value;
    case 'gt': return fieldValue > value;
    case 'gte': return fieldValue >= value;
    case 'lt': return fieldValue < value;
    case 'lte': return fieldValue <= value;
    default: return false;
  }
}

// 检查还款计划逾期 + 累计逾期天数
async function checkRepaymentOverdue() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 所有未还清且已过期的还款计划
    const plans = await RepaymentPlan.find({
      status: { $in: ['pending', 'partial', 'overdue'] },
      dueDate: { $lte: today }
    });

    for (const plan of plans) {
      const dueDate = new Date(plan.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

      plan.overdueDays = diffDays;
      if (plan.status === 'pending') plan.status = 'overdue';
      await plan.save();
    }

    if (plans.length > 0) {
      logger.info(`${plans.length}条还款计划逾期天数已更新`);
    }

    // 同步客户级逾期状态
    const customers = await Customer.find({
      status: { $ne: 'completed' }
    }).populate('salesmanId', 'name phone openid');

    // 找第一个启用的规则来获取 reminderInterval
    const activeRule = await OverdueRule.findOne({ isActive: true });

    for (const customer of customers) {
      const overduePlans = await RepaymentPlan.find({
        customerId: customer._id,
        status: { $in: ['partial', 'overdue'] },
        overdueDays: { $gt: 0 }
      });

      const maxOverdue = overduePlans.reduce(
        (max, p) => Math.max(max, p.overdueDays || 0), 0
      );

      if (maxOverdue > 0) {
        const wasOverdue = customer.isOverdue;
        customer.overdueDays = maxOverdue;
        customer.isOverdue = true;

        if (!wasOverdue) {
          customer.status = 'overdue';
          const worst = overduePlans.find(p => p.overdueDays === maxOverdue);
          customer.overdueReason = `第${worst.period}期还款逾期`;
        }

        await customer.save();

        // 发送还款逾期通知（应用间隔逻辑）
        const overdueReason = customer.overdueReason;
        await sendNotificationWithInterval(
          customer, activeRule, 'repayment_overdue', overdueReason
        );
      }
    }
  } catch (error) {
    logger.error('还款计划逾期检查错误', { error: error.message });
  }
}

// 恢复已不逾期的客户（所有逾期还款都还清了）
async function recoverCustomers() {
  try {
    const overdueCustomers = await Customer.find({ isOverdue: true, status: { $ne: 'completed' } });

    for (const customer of overdueCustomers) {
      const stillOverdue = await RepaymentPlan.countDocuments({
        customerId: customer._id,
        status: { $in: ['overdue'] }
      });

      if (stillOverdue === 0) {
        customer.isOverdue = false;
        customer.overdueDays = 0;
        customer.overdueReason = '';
        customer.status = customer.isCollected === '已入库' ? 'stored' : 'pending';
        await customer.save();
        logger.info('客户恢复正常', { customer: customer.customerName });
      }
    }
  } catch (error) {
    logger.error('恢复客户状态错误', { error: error.message });
  }
}

// 通用通知发送（带间隔逻辑）
async function sendNotificationWithInterval(customer, rule, type, overdueReason) {
  try {
    if (rule && !rule.reminderEnabled) return;

    const interval = rule?.reminderInterval || 0;

    // 确定接收人
    let recipient = null;
    if (customer.salesmanId) {
      recipient = customer.salesmanId;
    } else if (!rule || rule.unassignedAction === 'admin') {
      recipient = await User.findOne({ role: 'admin', status: 'active' });
    } else {
      return;
    }
    if (!recipient) return;

    // 间隔判断
    const lastNotif = await NotificationLog
      .findOne({ customerId: customer._id, userId: recipient._id, type, overdueReason })
      .sort({ createdAt: -1 });

    if (lastNotif) {
      if (interval === 0) return;  // 只通知一次
      const daysSince = Math.floor(
        (Date.now() - new Date(lastNotif.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince < interval) return;
    }

    // 发送
    const daysText = customer.overdueDays > 0 ? ` 已逾期${customer.overdueDays}天` : '';
    const content = `客户${customer.customerName}${overdueReason}${daysText}`;

    if (recipient.openid) {
      await sendSubscriptionMessage({
        openid: recipient.openid,
        data: {
          thing1: { value: customer.customerName },
          thing2: { value: `${overdueReason}${daysText}` },
          time3: { value: new Date().toLocaleString('zh-CN') }
        },
        page: `pages/detail/detail?id=${customer._id}`
      });
    }

    await NotificationLog.create({
      customerId: customer._id,
      userId: recipient._id,
      type,
      content,
      overdueReason
    });

    logger.info('逾期通知已发送', {
      customer: customer.customerName,
      recipient: recipient.name,
      type,
      overdueDays: customer.overdueDays
    });
  } catch (error) {
    logger.error('发送逾期通知错误', { error: error.message });
  }
}

// 启动定时任务
function startOverdueScheduler() {
  cron.schedule('0 9 * * *', () => {
    logger.info('开始执行逾期检查');
    checkOverdue();
  });
  logger.info('逾期检查定时任务已启动');
}

// 手动执行逾期检查
async function runManualCheck() {
  await checkOverdue();
}

module.exports = {
  startOverdueScheduler,
  runManualCheck
};
