// 一次性数据迁移: repaymentrecords (旧) → repaymentplans (新)
// 使用: node scripts/migrate-repayment.js [--dry-run]
// 必须在 server 目录下执行,要求 .env 已配置 MONGODB_URI

require('dotenv').config();
const mongoose = require('mongoose');
const RepaymentPlan = require('../src/models/RepaymentPlan');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`[migrate-repayment] mode=${dryRun ? 'dry-run' : 'live'}`);

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const oldRecords = await db.collection('repaymentrecords')
    .find({}).sort({ customerId: 1, month: 1 }).toArray();
  console.log(`读取到 ${oldRecords.length} 条旧记录`);

  if (oldRecords.length === 0) {
    console.log('没有需要迁移的数据');
    await mongoose.disconnect();
    return;
  }

  // 按 customerId 分组
  const byCustomer = new Map();
  for (const r of oldRecords) {
    const key = r.customerId.toString();
    if (!byCustomer.has(key)) byCustomer.set(key, []);
    byCustomer.get(key).push(r);
  }

  // 构造新文档
  const newDocs = [];
  for (const [customerId, records] of byCustomer) {
    records.sort((a, b) => a.month.localeCompare(b.month));
    records.forEach((r, i) => {
      newDocs.push({
        customerId: r.customerId,
        period: i + 1,
        dueDate: new Date(r.month + 'T00:00:00.000Z'),
        expectedAmount: r.expectedAmount || 0,
        actualAmount: r.status === 'paid' ? (r.amount || 0) : null,
        interest: null,
        status: r.status,
        paidAt: r.status === 'paid' ? r.updatedAt : null,
        remark: r.remark || '',
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      });
    });
  }

  console.log(`待写入: ${newDocs.length} 条 / ${byCustomer.size} 客户`);
  console.log('样本 (前 3 条):');
  for (const d of newDocs.slice(0, 3)) {
    console.log(' ', {
      customerId: d.customerId.toString(),
      period: d.period,
      dueDate: d.dueDate.toISOString().slice(0, 10),
      expectedAmount: d.expectedAmount,
      actualAmount: d.actualAmount,
      status: d.status
    });
  }

  if (dryRun) {
    console.log('[dry-run] 不写入数据库,退出');
    await mongoose.disconnect();
    return;
  }

  // 安全检查: 目标集合必须是空的
  const existing = await RepaymentPlan.countDocuments();
  if (existing > 0) {
    console.error(`[中止] repaymentplans 已有 ${existing} 条数据,避免重复写入`);
    await mongoose.disconnect();
    process.exit(1);
  }

  await RepaymentPlan.insertMany(newDocs);
  console.log(`已写入 ${newDocs.length} 条到 repaymentplans`);

  // 验证每个客户的条数一致
  console.log('\n=== 验证 ===');
  let allOk = true;
  for (const [customerId, records] of byCustomer) {
    const newCount = await RepaymentPlan.countDocuments({
      customerId: new mongoose.Types.ObjectId(customerId)
    });
    const ok = newCount === records.length;
    if (!ok) allOk = false;
    console.log(`  ${customerId}: 旧 ${records.length} → 新 ${newCount} ${ok ? 'OK' : 'FAIL'}`);
  }

  await mongoose.disconnect();
  if (!allOk) {
    console.error('验证失败');
    process.exit(1);
  }
  console.log('\n迁移完成');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
