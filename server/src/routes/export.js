const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Customer = require('../models/Customer');
const User = require('../models/User');
const RepaymentPlan = require('../models/RepaymentPlan');
const { authenticate, requireAdmin } = require('../middleware/auth');

const importUpload = multer({ storage: multer.memoryStorage() });

// 导出客户数据
router.get('/customers', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, isOverdue, salesmanId, startDate, endDate } = req.query;

    const query = {};
    if (status) query.status = status;
    if (isOverdue !== undefined) query.isOverdue = isOverdue === 'true';
    if (salesmanId) query.salesmanId = salesmanId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const customers = await Customer.find(query)
      .populate('salesmanId', 'name phone')
      .sort({ createdAt: -1 });

    // 批量获取还款汇总
    const customerIds = customers.map(c => c._id);
    const repaymentAgg = await RepaymentPlan.aggregate([
      { $match: { customerId: { $in: customerIds } } },
      {
        $group: {
          _id: '$customerId',
          totalPeriods: { $sum: 1 },
          periodsPaid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          periodsOverdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
          totalPaid: { $sum: { $ifNull: ['$actualAmount', 0] } },
          totalInterest: { $sum: { $ifNull: ['$interest', 0] } }
        }
      }
    ]);

    const repaymentMap = {};
    for (const agg of repaymentAgg) {
      repaymentMap[agg._id.toString()] = agg;
    }

    // 转换为Excel数据
    const data = customers.map(c => {
      const rep = repaymentMap[c._id.toString()] || {};
      return {
        '客户姓名': c.customerName,
        '身份证': c.idCard,
        '车牌号': c.licensePlate,
        '车架号': c.frameNumber,
        '车品牌': c.carBrand,
        '客户地址': c.customerAddress,
        '客户电话': c.customerPhone,
        '业务员': c.salesmanId?.name || '',
        '业务员电话': c.salesmanId?.phone || '',
        '档案收取员': c.archiveReceiver,
        '客户来源': c.customerSource,
        '渠道名称': c.channelName,
        '渠道电话': c.channelPhone,
        '开户行': c.bankName,
        '银行卡号': c.bankCardNumber,
        '评估金额(万元)': c.assessmentAmount,
        '是否按揭': c.isMortgage ? '是' : '否',
        '收车金额': c.collectionAmount,
        '收车方案': c.collectionPlan,
        '试算': c.trialCalculation,
        '每期还款额': c.monthlyRepayment || '',
        '是否收车': c.isCollected,
        '收车人': c.collector,
        '申请时间': c.applicationTime ? new Date(c.applicationTime).toLocaleDateString() : '',
        '预计销售时间': c.expectedSaleTime ? new Date(c.expectedSaleTime).toLocaleDateString() : '',
        '状态': getStatusText(c.status),
        '是否逾期': c.isOverdue ? '是' : '否',
        '逾期天数': c.overdueDays || 0,
        '逾期原因': c.overdueReason,
        '总期数': rep.totalPeriods || '',
        '已还期数': rep.periodsPaid || '',
        '逾期期数': rep.periodsOverdue || '',
        '已还总额': rep.totalPaid || '',
        '已还利息': rep.totalInterest || '',
        '创建时间': new Date(c.createdAt).toLocaleString()
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    autoFitColumns(ws, data);
    XLSX.utils.book_append_sheet(wb, ws, '客户数据');

    // 第二个 sheet：还款明细
    const allPlans = await RepaymentPlan.find({
      customerId: { $in: customerIds }
    }).sort({ customerId: 1, period: 1 });

    const customerMap = {};
    customers.forEach(c => { customerMap[c._id.toString()] = c; });

    const planData = allPlans.map(p => {
      const c = customerMap[p.customerId.toString()] || {};
      return {
        '客户姓名': c.customerName || '',
        '身份证': c.idCard || '',
        '车牌号': c.licensePlate || '',
        '业务员': c.salesmanId?.name || '',
        '期数': p.period,
        '到期日': p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '',
        '应还金额': p.expectedAmount,
        '已还金额': p.paidAmount || 0,
        '利息': p.interest || 0,
        '状态': getPlanStatusText(p.status),
        '逾期天数': p.overdueDays || 0,
        '还款时间': p.paidAt ? new Date(p.paidAt).toLocaleString() : '',
        '备注': p.remark || ''
      };
    });

    const ws2 = XLSX.utils.json_to_sheet(planData);
    autoFitColumns(ws2, planData);
    XLSX.utils.book_append_sheet(wb, ws2, '还款明细');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=customers_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('导出客户数据错误:', error);
    res.status(500).json({ message: '导出失败' });
  }
});

// 导入客户数据
router.post('/customers', authenticate, requireAdmin, importUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传Excel文件' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const row of data) {
      try {
        // 查找业务员
        let salesmanId = null;
        if (row['业务员电话']) {
          const salesman = await User.findOne({ phone: row['业务员电话'], role: 'salesman' });
          if (salesman) {
            salesmanId = salesman._id;
          }
        }

        const customer = new Customer({
          customerName: row['客户姓名'],
          idCard: row['身份证'],
          licensePlate: row['车牌号'],
          frameNumber: row['车架号'],
          carBrand: row['车品牌'],
          customerAddress: row['客户地址'],
          customerPhone: row['客户电话'],
          salesmanId,
          archiveReceiver: row['档案收取员'],
          customerSource: row['客户来源'],
          channelName: row['渠道名称'],
          channelPhone: row['渠道电话'],
          bankName: row['开户行'],
          bankCardNumber: row['银行卡号'],
          assessmentAmount: parseFloat(row['评估金额(万元)']) || 0,
          isMortgage: row['是否按揭'] === '是',
          collectionAmount: parseFloat(row['收车金额']) || 0,
          collectionPlan: row['收车方案'],
          trialCalculation: row['试算'],
          monthlyRepayment: parseFloat(row['每期还款额']) || 0,
          isCollected: row['是否收车'] || '未入库',
          collector: row['收车人'],
          createdBy: req.user._id
        });

        await customer.save();
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          row: row['客户姓名'] || '未知',
          error: err.message
        });
      }
    }

    res.json({
      message: '导入完成',
      data: results
    });
  } catch (error) {
    console.error('导入客户数据错误:', error);
    res.status(500).json({ message: '导入失败' });
  }
});

function getStatusText(status) {
  const statusMap = {
    pending: '未入库',
    stored: '已入库',
    overdue: '逾期',
    completed: '已完成'
  };
  return statusMap[status] || status;
}

function autoFitColumns(ws, jsonData) {
  if (!jsonData.length) return;
  const headers = Object.keys(jsonData[0]);
  ws['!cols'] = headers.map((h, i) => {
    let maxLen = h.length * 2; // 中文字符按2倍算
    for (const row of jsonData.slice(0, 50)) {
      const val = String(row[h] ?? '');
      const len = [...val].reduce((s, c) => s + (c.charCodeAt(0) > 127 ? 2 : 1), 0);
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(maxLen + 2, 40) };
  });
}

function getPlanStatusText(status) {
  const statusMap = {
    pending: '待还',
    partial: '部分还款',
    paid: '已还清',
    overdue: '逾期'
  };
  return statusMap[status] || status;
}

module.exports = router;
