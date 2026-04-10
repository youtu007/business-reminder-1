require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const morgan = require('morgan');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const customerRoutes = require('./routes/customers');
const uploadRoutes = require('./routes/upload');
const overdueRuleRoutes = require('./routes/overdueRules');
const configRoutes = require('./routes/configs');
const exportRoutes = require('./routes/export');
const ocrRoutes = require('./routes/ocr');
const { startOverdueScheduler } = require('./services/overdueService');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP请求日志
app.use(morgan(':method :url :status :response-time ms', {
  stream: { write: (msg) => logger.info(msg.trim()) }
}));

// 静态文件服务（上传的文件）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/overdue-rules', overdueRuleRoutes);
app.use('/api/configs', configRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', exportRoutes);
app.use('/api/ocr', ocrRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('请求错误', { error: err.message, stack: err.stack, url: req.url });

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: '文件大小超过限制' });
    }
    return res.status(400).json({ message: err.message });
  }

  res.status(500).json({ message: '服务器内部错误' });
});

// 连接数据库并启动服务器
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/business_reminder';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    logger.info('MongoDB连接成功');

    // 初始化默认管理员
    const User = require('./models/User');
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (!existingAdmin) {
      await User.create({
        name: '系统管理员',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        phone: '13021630326',
        status: 'active'
      });
      logger.info('默认管理员账户已创建 (用户名: admin, 密码: admin123, 手机号: 13021630326)');
    } else if (existingAdmin.phone !== '13021630326') {
      // 更新管理员手机号
      existingAdmin.phone = '13021630326';
      await existingAdmin.save();
      logger.info('管理员手机号已更新为 13021630326');
    }

    // 初始化默认配置
    const Config = require('./models/Config');
    const defaultConfigs = [
      {
        key: 'banks',
        value: ['中国工商银行', '中国建设银行', '中国农业银行', '中国银行', '交通银行', '招商银行', '中国邮政储蓄银行'],
        description: '开户行列表'
      },
      {
        key: 'customerSources',
        value: ['渠道', '直客'],
        description: '客户来源列表'
      },
      {
        key: 'collectionPlans',
        value: [
          { name: '1.00% + 600.00', rate: 0.01, fee: 600 },
          { name: '1.50% + 600.00', rate: 0.015, fee: 600 },
          { name: '2.00% + 600.00', rate: 0.02, fee: 600 }
        ],
        description: '收车方案列表'
      }
    ];

    for (const config of defaultConfigs) {
      await Config.findOneAndUpdate(
        { key: config.key },
        config,
        { upsert: true }
      );
    }

    // 启动逾期检查定时任务
    startOverdueScheduler();

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`服务器运行在 http://0.0.0.0:${PORT}`);
    });
  })
  .catch(err => {
    logger.error('MongoDB连接失败', { error: err.message });
    process.exit(1);
  });

module.exports = app;
