const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

function getOcrClient() {
  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;

  if (!secretId || !secretKey) {
    return null;
  }

  const tencentcloud = require('tencentcloud-sdk-nodejs-ocr');
  const OcrClient = tencentcloud.ocr.v20181119.Client;

  return new OcrClient({
    credential: { secretId, secretKey },
    region: 'ap-guangzhou',
    profile: { httpProfile: { endpoint: 'ocr.tencentcloudapi.com' } }
  });
}

// 身份证OCR识别
router.post('/idcard', authenticate, async (req, res) => {
  try {
    const { imageUrl, imageBase64 } = req.body;

    if (!imageUrl && !imageBase64) {
      return res.status(400).json({ message: '请提供图片地址或图片数据' });
    }

    const client = getOcrClient();
    if (!client) {
      return res.json({ message: 'OCR服务未配置', data: null });
    }

    logger.info('身份证OCR识别请求', { imageUrl });

    const params = {};
    if (imageUrl) {
      params.ImageUrl = imageUrl;
    } else {
      params.ImageBase64 = imageBase64;
    }

    const result = await client.IDCardOCR(params);

    res.json({
      data: {
        name: result.Name || '',
        idNumber: result.IdNum || '',
        address: result.Address || '',
        gender: result.Sex || '',
        nation: result.Nation || '',
        birth: result.Birth || ''
      }
    });
  } catch (error) {
    logger.error('身份证OCR识别错误', { error: error.message });
    res.status(500).json({ message: 'OCR识别失败', data: null });
  }
});

// 银行卡OCR识别
router.post('/bankcard', authenticate, async (req, res) => {
  try {
    const { imageUrl, imageBase64 } = req.body;

    if (!imageUrl && !imageBase64) {
      return res.status(400).json({ message: '请提供图片地址或图片数据' });
    }

    const client = getOcrClient();
    if (!client) {
      return res.json({ message: 'OCR服务未配置', data: null });
    }

    logger.info('银行卡OCR识别请求', { imageUrl });

    const params = {};
    if (imageUrl) {
      params.ImageUrl = imageUrl;
    } else {
      params.ImageBase64 = imageBase64;
    }

    const result = await client.BankCardOCR(params);

    res.json({
      data: {
        cardNumber: result.CardNo || '',
        bankName: result.BankInfo || '',
        cardType: result.CardType || ''
      }
    });
  } catch (error) {
    logger.error('银行卡OCR识别错误', { error: error.message });
    res.status(500).json({ message: 'OCR识别失败', data: null });
  }
});

module.exports = router;
