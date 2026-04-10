const express = require('express');
const router = express.Router();
const Config = require('../models/Config');
const { authenticate, requireAdmin } = require('../middleware/auth');

// 获取所有配置
router.get('/', authenticate, async (req, res) => {
  try {
    const configs = await Config.find();
    const configMap = {};
    configs.forEach(config => {
      configMap[config.key] = config.value;
    });
    res.json({ data: configMap });
  } catch (error) {
    console.error('获取配置错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取单个配置
router.get('/:key', authenticate, async (req, res) => {
  try {
    const config = await Config.findOne({ key: req.params.key });
    if (!config) {
      return res.status(404).json({ message: '配置不存在' });
    }
    res.json({ data: config });
  } catch (error) {
    console.error('获取配置错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 更新配置
router.put('/:key', authenticate, requireAdmin, async (req, res) => {
  try {
    const { value, description } = req.body;

    let config = await Config.findOne({ key: req.params.key });

    if (config) {
      config.value = value;
      if (description) config.description = description;
      await config.save();
    } else {
      config = await Config.create({
        key: req.params.key,
        value,
        description
      });
    }

    res.json({
      message: '更新成功',
      data: config
    });
  } catch (error) {
    console.error('更新配置错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 初始化默认配置
router.post('/init', authenticate, requireAdmin, async (req, res) => {
  try {
    const defaultConfigs = [
      {
        key: 'banks',
        value: ['中国工商银行', '中国建设银行', '中国农业银行', '中国银行', '交通银行', '招商银行', '中国邮政储蓄银行'],
        description: '开户行列表'
      },
      {
        key: 'customerSources',
        value: ['自然到店', '渠道介绍', '网络推广', '老客户介绍', '其他'],
        description: '客户来源列表'
      },
      {
        key: 'collectionPlans',
        value: ['方案A', '方案B', '方案C'],
        description: '收车方案列表'
      }
    ];

    for (const config of defaultConfigs) {
      await Config.findOneAndUpdate(
        { key: config.key },
        config,
        { upsert: true, new: true }
      );
    }

    res.json({ message: '初始化成功' });
  } catch (error) {
    console.error('初始化配置错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
