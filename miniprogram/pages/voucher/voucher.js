const app = getApp()

Page({
  data: {
    id: '',
    customer: null,
    vouchers: [],
    loading: true
  },

  onLoad(options) {
    if (!app.checkLogin()) return
    if (options.id) {
      this.setData({ id: options.id })
      this.loadCustomer(options.id)
    }
  },

  async loadCustomer(id) {
    try {
      const res = await app.request({ url: `/customers/${id}` })
      this.setData({
        customer: res.data,
        vouchers: res.data.images?.voucherPhotos || [],
        loading: false
      })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  // 选择图片
  chooseImage() {
    wx.chooseMedia({
      count: 9 - this.data.vouchers.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath)
        this.uploadImages(newImages)
      }
    })
  },

  // 上传图片
  async uploadImages(tempFilePaths) {
    wx.showLoading({ title: '上传中...' })

    try {
      const uploadedUrls = []
      for (const filePath of tempFilePaths) {
        const url = await this.uploadSingleImage(filePath)
        if (url) uploadedUrls.push(url)
      }

      const newVouchers = [...this.data.vouchers, ...uploadedUrls]
      this.setData({ vouchers: newVouchers })

      wx.hideLoading()
      wx.showToast({ title: '上传成功', icon: 'success' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '上传失败', icon: 'none' })
    }
  },

  // 上传单张图片
  uploadSingleImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: app.globalData.baseUrl + '/upload',
        filePath: filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${app.globalData.token}`
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            let url = data.url || data.data?.url
            if (url && url.startsWith('/')) {
              const baseUrl = app.globalData.baseUrl.replace('/api', '')
              url = baseUrl + url
            }
            resolve(url)
          } catch (e) {
            reject(e)
          }
        },
        fail: reject
      })
    })
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.currentTarget.dataset
    const vouchers = [...this.data.vouchers]
    vouchers.splice(index, 1)
    this.setData({ vouchers })
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({ current: url, urls: this.data.vouchers })
  },

  // 保存凭证
  async saveVoucher() {
    if (this.data.vouchers.length === 0) {
      return wx.showToast({ title: '请上传放款凭证', icon: 'none' })
    }

    wx.showLoading({ title: '保存中...' })

    try {
      await app.request({
        url: `/customers/${this.data.id}`,
        method: 'PUT',
        data: {
          'images.voucherPhotos': this.data.vouchers
        }
      })

      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    }
  }
})
