App({
  globalData: {
    // 生产环境
    baseUrl: 'https://business.fengshi.site/api',
    token: '',
    userInfo: null
  },

  // 判断是否是管理员
  isAdmin() {
    return this.globalData.userInfo && this.globalData.userInfo.role === 'admin'
  },

  onLaunch() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    if (token) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
    }
  },

  request(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.globalData.baseUrl + options.url,
        method: options.method || 'GET',
        data: options.data,
        header: {
          'Content-Type': 'application/json',
          'Authorization': this.globalData.token ? `Bearer ${this.globalData.token}` : ''
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else if (res.statusCode === 401) {
            this.logout()
            reject(new Error('登录已过期'))
          } else {
            reject(new Error(res.data.message || '请求失败'))
          }
        },
        fail: reject
      })
    })
  },

  login(phone) {
    return this.request({
      url: '/auth/wx/login',
      method: 'POST',
      data: { phone }
    }).then(res => {
      this.globalData.token = res.token
      this.globalData.userInfo = res.user
      wx.setStorageSync('token', res.token)
      wx.setStorageSync('userInfo', res.user)
      return res
    })
  },

  logout() {
    this.globalData.token = ''
    this.globalData.userInfo = null
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    wx.redirectTo({ url: '/pages/login/login' })
  },

  checkLogin() {
    if (!this.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' })
      return false
    }
    return true
  }
})
