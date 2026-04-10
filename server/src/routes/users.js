const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');

// 获取用户列表（管理员）
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { role, status, keyword, page = 1, limit = 20 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (keyword) {
      query.$or = [
        { name: new RegExp(keyword, 'i') },
        { phone: new RegExp(keyword, 'i') }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取业务员列表（简化版，用于下拉选择）
router.get('/salesmen', authenticate, async (req, res) => {
  try {
    const salesmen = await User.find({ role: 'salesman', status: 'active' })
      .select('_id name phone')
      .sort({ name: 1 });

    res.json({ data: salesmen });
  } catch (error) {
    console.error('获取业务员列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建业务员（管理员）
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, phone, role = 'admin', username, password } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: '姓名和手机号为必填项' });
    }

    // 检查手机号是否已存在
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: '该手机号已被使用' });
    }

    // 如果是管理员，需要用户名和密码
    if (role === 'admin') {
      if (!username || !password) {
        return res.status(400).json({ message: '管理员需要用户名和密码' });
      }
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ message: '该用户名已被使用' });
      }
    }

    const user = new User({
      name,
      phone,
      role,
      username: role === 'admin' ? username : undefined,
      password: role === 'admin' ? password : undefined,
      status: 'active'
    });

    await user.save();

    res.status(201).json({
      message: '创建成功',
      data: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新用户
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, phone, status, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 检查手机号是否被其他用户使用
    if (phone && phone !== user.phone) {
      const existingPhone = await User.findOne({ phone, _id: { $ne: user._id } });
      if (existingPhone) {
        return res.status(400).json({ message: '该手机号已被使用' });
      }
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (status) user.status = status;
    if (password) user.password = password;

    await user.save();

    res.json({
      message: '更新成功',
      data: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除用户
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 不允许删除自己
    if (user._id.equals(req.user._id)) {
      return res.status(400).json({ message: '不能删除自己的账户' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
