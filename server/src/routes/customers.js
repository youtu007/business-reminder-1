const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const AssignmentLog = require('../models/AssignmentLog');
const RepaymentPlan = require('../models/RepaymentPlan');
const { authenticate, requireAdmin } = require('../middleware/auth');

// 获取客户列表
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      status,
      isOverdue,
      salesmanId,
      keyword,
      startDate,
      endDate,
      // 单独字段筛选
      collectionAmount,
      idCard,
      customerName,
      licensePlate,
      carBrand,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    // 业务员只能查看自己的客户
    if (req.user.role === 'salesman') {
      query.salesmanId = req.user._id;
    } else if (salesmanId) {
      query.salesmanId = salesmanId;
    }

    if (status) query.status = status;
    if (isOverdue !== undefined) query.isOverdue = isOverdue === 'true';

    // 通用关键词搜索
    if (keyword) {
      query.$or = [
        { customerName: new RegExp(keyword, 'i') },
        { idCard: new RegExp(keyword, 'i') },
        { licensePlate: new RegExp(keyword, 'i') },
        { frameNumber: new RegExp(keyword, 'i') },
        { customerPhone: new RegExp(keyword, 'i') }
      ];
    }

    // 单独字段筛选
    if (collectionAmount) {
      query.collectionAmount = parseFloat(collectionAmount);
    }
    if (idCard) {
      query.idCard = new RegExp(idCard, 'i');
    }
    if (customerName) {
      query.customerName = new RegExp(customerName, 'i');
    }
    if (licensePlate) {
      query.licensePlate = new RegExp(licensePlate, 'i');
    }
    if (carBrand) {
      query.carBrand = new RegExp(carBrand, 'i');
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59');
    }

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .populate('salesmanId', 'name phone')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // 批量查询所有返回客户的还款汇总
    const customerIds = customers.map(c => c._id);
    const repaymentStats = await RepaymentPlan.aggregate([
      { $match: { customerId: { $in: customerIds } } },
      { $group: {
        _id: '$customerId',
        totalPeriods: { $sum: 1 },
        paidPeriods: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
        totalExpected: { $sum: '$expectedAmount' },
        totalPaid: { $sum: { $ifNull: ['$paidAmount', 0] } },
        totalInterest: { $sum: { $ifNull: ['$interest', 0] } }
      }}
    ]);
    const statsMap = {};
    repaymentStats.forEach(s => {
      s.totalExpected = Math.round(s.totalExpected * 100) / 100;
      s.totalPaid = Math.round(s.totalPaid * 100) / 100;
      s.totalInterest = Math.round(s.totalInterest * 100) / 100;
      s.remaining = Math.round((s.totalExpected - s.totalPaid) * 100) / 100;
      statsMap[s._id.toString()] = s;
    });

    const customersWithStats = customers.map(c => {
      const obj = c.toObject();
      obj.repaymentStats = statsMap[c._id.toString()] || null;
      return obj;
    });

    res.json({
      data: customersWithStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取客户列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取统计数据（必须在 /:id 之前定义，否则 'stats' 会被当作 id）
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'salesman') {
      query.salesmanId = req.user._id;
    }

    const [total, pending, stored, overdue, completed] = await Promise.all([
      Customer.countDocuments(query),
      Customer.countDocuments({ ...query, status: 'pending' }),
      Customer.countDocuments({ ...query, status: 'stored' }),
      Customer.countDocuments({ ...query, isOverdue: true }),
      Customer.countDocuments({ ...query, status: 'completed' })
    ]);

    res.json({
      data: {
        total,
        pending,
        stored,
        overdue,
        completed
      }
    });
  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取客户详情
router.get('/:id', authenticate, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('salesmanId', 'name phone')
      .populate('createdBy', 'name');

    if (!customer) {
      return res.status(404).json({ message: '客户不存在' });
    }

    // 业务员只能查看自己的客户
    if (req.user.role === 'salesman' && (!customer.salesmanId || !customer.salesmanId._id.equals(req.user._id))) {
      return res.status(403).json({ message: '无权查看此客户' });
    }

    res.json({ data: customer });
  } catch (error) {
    console.error('获取客户详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建客户（管理员）
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const customerData = {
      ...req.body,
      createdBy: req.user._id
    };

    // 如果是草稿，跳过必填验证
    if (req.body.isDraft) {
      customerData.isDraft = true;
    }

    // 根据 isCollected 同步 status
    if (customerData.isCollected === '已入库' && !customerData.status) {
      customerData.status = 'stored';
    }

    const customer = new Customer(customerData);
    await customer.save();

    // 创建初始分配记录
    if (customerData.salesmanId) {
      await AssignmentLog.create({
        customerId: customer._id,
        toSalesmanId: customerData.salesmanId,
        operatorId: req.user._id,
        remark: '初始分配'
      });
    }

    // 自动生成还款计划（如果有申请时间、收车金额、每期还款额）
    if (customer.applicationTime && customer.collectionAmount && customer.monthlyRepayment && !customer.isDraft) {
      const totalPeriods = Math.ceil(customer.collectionAmount / customer.monthlyRepayment);
      const plans = [];
      for (let i = 1; i <= totalPeriods; i++) {
        const dueDate = new Date(customer.applicationTime);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
        const expectedAmount = i < totalPeriods
          ? customer.monthlyRepayment
          : customer.collectionAmount - customer.monthlyRepayment * (totalPeriods - 1);
        plans.push({
          customerId: customer._id,
          period: i,
          dueDate,
          expectedAmount: Math.round(expectedAmount * 100) / 100,
          status: dueDate <= new Date() ? 'overdue' : 'pending'
        });
      }
      await RepaymentPlan.insertMany(plans);

      // 如果有逾期期数，立即标记客户为逾期
      const overdueCount = plans.filter(p => p.status === 'overdue').length;
      if (overdueCount > 0) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const firstOverdue = plans.find(p => p.status === 'overdue');
        const dueDate = new Date(firstOverdue.dueDate); dueDate.setHours(0, 0, 0, 0);
        const overdueDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

        customer.isOverdue = true;
        customer.overdueDays = overdueDays;
        customer.overdueReason = `第${firstOverdue.period}期还款逾期`;
        customer.status = 'overdue';
        await customer.save();
      }
    }

    res.status(201).json({
      message: '创建成功',
      data: customer
    });
  } catch (error) {
    console.error('创建客户错误:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新客户（管理员）
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: '客户不存在' });
    }

    // 更新状态逻辑
    if (req.body.isCollected === '已入库' && customer.status === 'pending') {
      req.body.status = 'stored';
    }

    // 首次进入 completed 状态时记录结清时间
    if (req.body.status === 'completed' && customer.status !== 'completed' && !customer.completedAt) {
      req.body.completedAt = new Date();
    }

    Object.assign(customer, req.body);
    await customer.save();

    res.json({
      message: '更新成功',
      data: customer
    });
  } catch (error) {
    console.error('更新客户错误:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除客户（管理员）
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: '客户不存在' });
    }

    await Customer.findByIdAndDelete(req.params.id);
    // 同时删除分配记录
    await AssignmentLog.deleteMany({ customerId: req.params.id });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除客户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 分配/改派业务员
router.post('/:id/assign', authenticate, requireAdmin, async (req, res) => {
  try {
    const { salesmanId, remark } = req.body;

    if (!salesmanId) {
      return res.status(400).json({ message: '请选择业务员' });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: '客户不存在' });
    }

    const oldSalesmanId = customer.salesmanId;

    // 更新客户的业务员
    customer.salesmanId = salesmanId;
    await customer.save();

    // 创建分配记录
    await AssignmentLog.create({
      customerId: customer._id,
      fromSalesmanId: oldSalesmanId,
      toSalesmanId: salesmanId,
      operatorId: req.user._id,
      remark
    });

    res.json({
      message: '分配成功',
      data: customer
    });
  } catch (error) {
    console.error('分配业务员错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取分配记录
router.get('/:id/assignment-logs', authenticate, async (req, res) => {
  try {
    const logs = await AssignmentLog.find({ customerId: req.params.id })
      .populate('fromSalesmanId', 'name phone')
      .populate('toSalesmanId', 'name phone')
      .populate('operatorId', 'name')
      .sort({ createdAt: -1 });

    res.json({ data: logs });
  } catch (error) {
    console.error('获取分配记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取客户还款计划
router.get('/:id/repayment-plans', authenticate, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: '客户不存在' });
    }

    // 业务员只能查看自己的客户
    if (req.user.role === 'salesman' && !customer.salesmanId?.equals(req.user._id)) {
      return res.status(403).json({ message: '无权查看此客户' });
    }

    const plans = await RepaymentPlan.find({ customerId: req.params.id })
      .sort({ period: 1 });

    res.json({ data: plans });
  } catch (error) {
    console.error('获取还款计划错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 生成还款计划（管理员）
router.post('/:id/repayment-plans/generate', authenticate, requireAdmin, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: '客户不存在' });
    }

    if (!customer.collectionAmount || !customer.monthlyRepayment || !customer.applicationTime) {
      return res.status(400).json({
        message: '请先完善收车金额、每期还款额和申请时间'
      });
    }

    // 删除旧计划（允许重新生成）
    await RepaymentPlan.deleteMany({ customerId: customer._id });

    const totalPeriods = Math.ceil(customer.collectionAmount / customer.monthlyRepayment);
    const plans = [];

    for (let i = 1; i <= totalPeriods; i++) {
      const dueDate = new Date(customer.applicationTime);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));  // 第1期=申请当天

      // 最后一期为剩余金额
      const expectedAmount = i < totalPeriods
        ? customer.monthlyRepayment
        : customer.collectionAmount - customer.monthlyRepayment * (totalPeriods - 1);

      plans.push({
        customerId: customer._id,
        period: i,
        dueDate,
        expectedAmount: Math.round(expectedAmount * 100) / 100,
        status: dueDate <= new Date() ? 'overdue' : 'pending'
      });
    }

    const created = await RepaymentPlan.insertMany(plans);

    res.status(201).json({
      message: `已生成${totalPeriods}期还款计划`,
      data: created
    });
  } catch (error) {
    console.error('生成还款计划错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 确认还款（管理员或负责业务员，支持分多次部分还款）
router.put('/:id/repayment-plans/:planId/pay', authenticate, async (req, res) => {
  try {
    const { actualAmount, interest, remark } = req.body;

    if (actualAmount === undefined || actualAmount === null || actualAmount <= 0) {
      return res.status(400).json({ message: '请输入本次还款金额' });
    }

    const plan = await RepaymentPlan.findOne({
      _id: req.params.planId,
      customerId: req.params.id
    });

    if (!plan) {
      return res.status(404).json({ message: '还款计划不存在' });
    }

    // 业务员只能操作自己的客户
    if (req.user.role === 'salesman') {
      const customer = await Customer.findById(req.params.id);
      if (!customer?.salesmanId?.equals(req.user._id)) {
        return res.status(403).json({ message: '无权操作此客户' });
      }
    }

    if (plan.status === 'paid') {
      return res.status(400).json({ message: '该期已还清' });
    }

    // 累加还款金额
    plan.paidAmount = (plan.paidAmount || 0) + actualAmount;
    plan.interest = (plan.interest || 0) + (interest || 0);

    // 备注按时间追加
    if (remark) {
      const dateStr = new Date().toLocaleDateString('zh-CN');
      const entry = `[${dateStr}] 还款${actualAmount}元 ${remark}`;
      plan.remark = plan.remark ? `${plan.remark}\n${entry}` : entry;
    }

    // 状态判定
    if (plan.paidAmount >= plan.expectedAmount) {
      plan.status = 'paid';
      plan.paidAt = new Date();
      plan.overdueDays = 0;
    } else {
      plan.status = 'partial';
    }

    // actualAmount 保持兼容，设为累计已还
    plan.actualAmount = plan.paidAmount;
    await plan.save();

    // 检查是否所有期都已还完
    const remaining = await RepaymentPlan.countDocuments({
      customerId: req.params.id,
      status: { $nin: ['paid'] }
    });

    if (remaining === 0) {
      await Customer.findByIdAndUpdate(req.params.id, {
        status: 'completed',
        isOverdue: false,
        overdueDays: 0,
        overdueReason: '',
        completedAt: new Date()
      });
    } else {
      // 检查是否还有逾期
      const overdueCount = await RepaymentPlan.countDocuments({
        customerId: req.params.id,
        status: 'overdue'
      });
      if (overdueCount === 0) {
        const customer = await Customer.findById(req.params.id);
        if (customer.isOverdue) {
          customer.isOverdue = false;
          customer.overdueDays = 0;
          customer.overdueReason = '';
          customer.status = customer.isCollected === '已入库' ? 'stored' : 'pending';
          await customer.save();
        }
      }
    }

    res.json({ message: '还款确认成功', data: plan });
  } catch (error) {
    console.error('确认还款错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取还款汇总
router.get('/:id/repayment-summary', authenticate, async (req, res) => {
  try {
    const plans = await RepaymentPlan.find({ customerId: req.params.id });

    const summary = {
      totalPeriods: plans.length,
      periodsPaid: plans.filter(p => p.status === 'paid').length,
      periodsOverdue: plans.filter(p => p.status === 'overdue').length,
      periodsPending: plans.filter(p => p.status === 'pending').length,
      totalExpected: plans.reduce((sum, p) => sum + p.expectedAmount, 0),
      totalPaid: plans.reduce((sum, p) => sum + (p.actualAmount || 0), 0),
      totalInterest: plans.reduce((sum, p) => sum + (p.interest || 0), 0)
    };

    res.json({ data: summary });
  } catch (error) {
    console.error('获取还款汇总错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
