const express = require('express');
const router = express.Router();
const OverdueRule = require('../models/OverdueRule');
const { authenticate, requireAdmin } = require('../middleware/auth');

// 获取规则列表
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const rules = await OverdueRule.find().sort({ createdAt: -1 });
    res.json({ data: rules });
  } catch (error) {
    console.error('获取规则列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取规则详情
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const rule = await OverdueRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: '规则不存在' });
    }
    res.json({ data: rule });
  } catch (error) {
    console.error('获取规则详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建规则
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, condition, daysThreshold, reminderEnabled, reminderTime, unassignedAction, isActive } = req.body;

    if (!name || !condition || !daysThreshold) {
      return res.status(400).json({ message: '规则名称、条件和逾期天数为必填项' });
    }

    const rule = new OverdueRule({
      name,
      condition,
      daysThreshold,
      reminderEnabled: reminderEnabled !== false,
      reminderTime: reminderTime || '09:00',
      unassignedAction: unassignedAction || 'admin',
      isActive: isActive !== false
    });

    await rule.save();

    res.status(201).json({
      message: '创建成功',
      data: rule
    });
  } catch (error) {
    console.error('创建规则错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新规则
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const rule = await OverdueRule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({ message: '规则不存在' });
    }

    Object.assign(rule, req.body);
    await rule.save();

    res.json({
      message: '更新成功',
      data: rule
    });
  } catch (error) {
    console.error('更新规则错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除规则
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const rule = await OverdueRule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({ message: '规则不存在' });
    }

    await OverdueRule.findByIdAndDelete(req.params.id);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除规则错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
