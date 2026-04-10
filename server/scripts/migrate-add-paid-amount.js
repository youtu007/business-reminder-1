// 一次性迁移: 给 RepaymentPlan 加 paidAmount + overdueDays, 给 Customer 加 overdueDays
// 使用: node scripts/migrate-add-paid-amount.js
// 必须在 server 目录下执行

require('dotenv').config();
const mongoose = require('mongoose');
const RepaymentPlan = require('../src/models/RepaymentPlan');
const Customer = require('../src/models/Customer');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('连接数据库成功');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1) 已 paid 的还款计划: 同步 paidAmount
  const paidPlans = await RepaymentPlan.find({ status: 'paid' });
  console.log(`[1/3] 同步 ${paidPlans.length} 条已还款记录的 paidAmount`);
  for (const p of paidPlans) {
    p.paidAmount = p.actualAmount || p.expectedAmount;
    await p.save();
  }

  // 2) 逾期的还款计划: 计算 overdueDays
  const overduePlans = await RepaymentPlan.find({
    status: { $in: ['pending', 'overdue'] },
    dueDate: { $lt: today }
  });
  console.log(`[2/3] 重算 ${overduePlans.length} 条逾期记录的 overdueDays`);
  for (const p of overduePlans) {
    const due = new Date(p.dueDate);
    due.setHours(0, 0, 0, 0);
    p.overdueDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    if (p.status === 'pending') p.status = 'overdue';
    await p.save();
  }

  // 3) 客户 overdueDays 同步
  const customers = await Customer.find({});
  console.log(`[3/3] 同步 ${customers.length} 个客户的 overdueDays`);
  for (const c of customers) {
    const cps = await RepaymentPlan.find({
      customerId: c._id,
      status: { $in: ['partial', 'overdue'] },
      overdueDays: { $gt: 0 }
    });
    const maxOd = cps.reduce((m, p) => Math.max(m, p.overdueDays || 0), 0);
    c.overdueDays = maxOd;
    if (maxOd > 0 && !c.isOverdue) {
      c.isOverdue = true;
      c.status = 'overdue';
      const worst = cps.find(p => p.overdueDays === maxOd);
      c.overdueReason = c.overdueReason || `第${worst.period}期还款逾期`;
    }
    await c.save();
    if (maxOd > 0) {
      console.log(`  ${c.customerName}: overdueDays=${maxOd}`);
    }
  }

  console.log('迁移完成');
  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
