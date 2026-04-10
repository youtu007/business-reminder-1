const express = require('express');
const router = express.Router();
const path = require('path');
const upload = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');

// 上传单个文件
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的文件' });
    }

    const fileUrl = `/uploads/${path.relative(process.env.UPLOAD_DIR || './uploads', req.file.path)}`;

    res.json({
      message: '上传成功',
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('上传文件错误:', error);
    res.status(500).json({ message: '上传失败' });
  }
});

// 上传多个文件
router.post('/multiple', authenticate, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: '请选择要上传的文件' });
    }

    const files = req.files.map(file => ({
      url: `/uploads/${path.relative(process.env.UPLOAD_DIR || './uploads', file.path)}`,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.json({
      message: '上传成功',
      data: files
    });
  } catch (error) {
    console.error('上传文件错误:', error);
    res.status(500).json({ message: '上传失败' });
  }
});

module.exports = router;
