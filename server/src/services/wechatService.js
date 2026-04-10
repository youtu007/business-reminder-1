const logger = require('../utils/logger');

let accessToken = null;
let tokenExpireTime = 0;

// 获取微信接口访问凭证
async function getAccessToken() {
  const now = Date.now();
  if (accessToken && now < tokenExpireTime) {
    return accessToken;
  }

  const appid = process.env.WX_APPID;
  const secret = process.env.WX_SECRET;

  if (!appid || !secret) {
    logger.warn('微信配置缺失，无法获取access_token');
    return null;
  }

  try {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.access_token) {
      accessToken = data.access_token;
      // 提前5分钟过期
      tokenExpireTime = now + (data.expires_in - 300) * 1000;
      return accessToken;
    }

    logger.error('获取access_token失败', { errcode: data.errcode, errmsg: data.errmsg });
    return null;
  } catch (error) {
    logger.error('获取access_token请求错误', { error: error.message });
    return null;
  }
}

// 发送订阅消息
async function sendSubscriptionMessage({ openid, templateId, data, page }) {
  if (!templateId) {
    templateId = process.env.WX_OVERDUE_TEMPLATE_ID;
  }

  if (!templateId) {
    logger.warn('未配置微信订阅消息模板ID');
    return { success: false, reason: 'no_template_id' };
  }

  const token = await getAccessToken();
  if (!token) {
    return { success: false, reason: 'no_access_token' };
  }

  try {
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`;
    const body = {
      touser: openid,
      template_id: templateId,
      data,
      miniprogram_state: process.env.NODE_ENV === 'production' ? 'formal' : 'trial'
    };

    if (page) {
      body.page = page;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (result.errcode === 0) {
      logger.info('订阅消息发送成功', { openid, templateId });
      return { success: true };
    }

    // token过期，刷新后重试一次
    if (result.errcode === 40001 || result.errcode === 42001) {
      accessToken = null;
      tokenExpireTime = 0;
      const newToken = await getAccessToken();
      if (newToken) {
        const retryUrl = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${newToken}`;
        const retryRes = await fetch(retryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const retryResult = await retryRes.json();
        if (retryResult.errcode === 0) {
          logger.info('订阅消息重试发送成功', { openid });
          return { success: true };
        }
        logger.error('订阅消息重试发送失败', { errcode: retryResult.errcode, errmsg: retryResult.errmsg });
        return { success: false, reason: retryResult.errmsg };
      }
    }

    logger.error('订阅消息发送失败', { errcode: result.errcode, errmsg: result.errmsg });
    return { success: false, reason: result.errmsg };
  } catch (error) {
    logger.error('订阅消息发送请求错误', { error: error.message });
    return { success: false, reason: error.message };
  }
}

module.exports = {
  getAccessToken,
  sendSubscriptionMessage
};
