const app = getApp()

Page({
  data: {
    phone: '',
    loading: false
  },

  onLoad() {
    if (app.globalData.token) {
      wx.redirectTo({ url: '/pages/index/index' })
    }
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  async handleLogin() {
    const { phone } = this.data

    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    try {
      await app.login(phone)
      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/index/index' })
      }, 1000)
    } catch (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  }
})
