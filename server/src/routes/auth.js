const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const { authenticate, generateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// 微信接口请求
async function getWxSession(code) {
  const appid = process.env.WX_APPID;
  const secret = process.env.WX_SECRET;
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;

  const res = await fetch(url);
  return res.json();
}

// 解密微信手机号
function decryptWxData(sessionKey, encryptedData, iv) {
  const sessionKeyBuffer = Buffer.from(sessionKey, 'base64');
  const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
  const ivBuffer = Buffer.from(iv, 'base64');

  const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
  decipher.setAutoPadding(true);

  let decoded = decipher.update(encryptedDataBuffer, 'binary', 'utf8');
  decoded += decipher.final('utf8');

  return JSON.parse(decoded);
}

// 管理员登录
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: '请输入用户名和密码' });
    }

    const user = await User.findOne({ username, role: 'admin' }).select('+password');
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ message: '账户已被禁用' });
    }

    const token = generateToken(user._id);

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 微信小程序登录（通过手机号）
router.post('/wx/login', async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone) {
      return res.status(400).json({ message: '请提供手机号' });
    }

    // 先查找用户（管理员或业务员）
    let user = await User.findOne({ phone });

    if (!user) {
      return res.status(401).json({ message: '未找到该手机号对应的账户' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ message: '账户已被禁用' });
    }

    // 如果提供了微信code，可以获取openid并绑定
    if (code) {
      // TODO: 调用微信API获取openid
    }

    const token = generateToken(user._id);

    logger.info('小程序登录成功', { userId: user._id, phone, role: user.role });

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('微信登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取当前用户信息
router.get('/profile', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      phone: req.user.phone,
      username: req.user.username,
      role: req.user.role,
      status: req.user.status
    }
  });
});

// 微信手机号快捷登录
router.post('/wx/phone', async (req, res) => {
  try {
    const { code, encryptedData, iv } = req.body;

    if (!code || !encryptedData || !iv) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    // 获取session_key
    const wxSession = await getWxSession(code);
    if (wxSession.errcode) {
      logger.error('获取微信session失败', { errcode: wxSession.errcode, errmsg: wxSession.errmsg });
      return res.status(400).json({ message: '微信授权失败' });
    }

    // 解密手机号
    let phoneData;
    try {
      phoneData = decryptWxData(wxSession.session_key, encryptedData, iv);
    } catch (err) {
      logger.error('解密手机号失败', { error: err.message });
      return res.status(400).json({ message: '解密手机号失败' });
    }

    const phone = phoneData.phoneNumber || phoneData.purePhoneNumber;
    if (!phone) {
      return res.status(400).json({ message: '获取手机号失败' });
    }

    // 查找业务员
    let user = await User.findOne({ phone, role: 'salesman' });
    if (!user) {
      return res.status(401).json({ message: '未找到该手机号对应的业务员账户' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ message: '账户已被禁用' });
    }

    // 绑定openid
    if (wxSession.openid && !user.openid) {
      user.openid = wxSession.openid;
      await user.save();
    }

    const token = generateToken(user._id);

    logger.info('微信手机号登录成功', { userId: user._id, phone });

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('微信手机号登录错误', { error: error.message });
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
