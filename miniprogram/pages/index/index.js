const app = getApp()

Page({
  data: {
    searchTypes: [
      { key: 'keyword', label: '类型' },
      { key: 'collectionAmount', label: '金额' },
      { key: 'idCard', label: '身份证号' },
      { key: 'customerName', label: '姓名' },
      { key: 'licensePlate', label: '车牌号' },
      { key: 'carBrand', label: '车品牌' }
    ],
    searchTypeIndex: 0,
    keyword: '',
    filterDate: '',
    activeTab: '',
    customers: [],
    loading: false,
    page: 1,
    limit: 20,
    hasMore: true,
    userInfo: null,
    isAdmin: true,
    
    stats: {
      total: 0,
      pending: 0,
      stored: 0,
      overdue: 0
    }
  },

  onLoad() {
    if (!app.checkLogin()) return
    this.setData({
      userInfo: app.globalData.userInfo,
      isAdmin: true
    })

    wx.setNavigationBarTitle({ title: '客户管理' })

    this.loadStats()
    this.loadCustomers()
  },

  onShow() {
    this.loadStats()
    this.loadCustomers(true)
  },

  onPullDownRefresh() {
    this.loadStats()
    this.loadCustomers(true)
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadCustomers()
    }
  },

  // 加载统计
  async loadStats() {
    try {
      const res = await app.request({ url: '/customers/stats/overview' })
      this.setData({ stats: res.data })
    } catch (err) {
      console.error('加载统计失败', err)
    }
  },

  // 搜索类型变更
  onSearchTypeChange(e) {
    this.setData({ searchTypeIndex: e.detail.value })
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  // 执行搜索
  onSearch() {
    this.setData({ page: 1, customers: [], hasMore: true })
    this.loadCustomers(true)
  },

  // 日期变更
  onDateChange(e) {
    this.setData({ filterDate: e.detail.value })
    this.onSearch()
  },

  // 清除日期
  clearDate() {
    this.setData({ filterDate: '' })
    this.onSearch()
  },

  // Tab切换
  onTabChange(e) {
    const { key } = e.currentTarget.dataset
    this.setData({
      activeTab: key,
      page: 1,
      customers: [],
      hasMore: true
    })
    this.loadCustomers(true)
  },

  // 加载客户列表
  async loadCustomers(refresh = false) {
    if (this.data.loading) return

    if (refresh) {
      this.setData({ page: 1, customers: [], hasMore: true })
    }

    if (!this.data.hasMore && !refresh) return

    this.setData({ loading: true })

    try {
      const params = { page: this.data.page, limit: this.data.limit }

      // 状态筛选
      if (this.data.activeTab) {
        if (this.data.activeTab === 'overdue') {
          params.isOverdue = true
        } else {
          params.status = this.data.activeTab
        }
      }

      // 关键词搜索
      if (this.data.keyword) {
        const searchType = this.data.searchTypes[this.data.searchTypeIndex]
        if (searchType.key === 'keyword') {
          params.keyword = this.data.keyword
        } else {
          params[searchType.key] = this.data.keyword
        }
      }

      // 日期筛选
      if (this.data.filterDate) {
        params.startDate = this.data.filterDate
        params.endDate = this.data.filterDate
      }


      const res = await app.request({ url: '/customers', data: params })
      const newCustomers = refresh ? res.data : [...this.data.customers, ...res.data]

      this.setData({
        customers: newCustomers,
        page: this.data.page + 1,
        hasMore: newCustomers.length < res.pagination.total
      })
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  // 查看详情（草稿直接进入编辑）
  viewDetail(e) {
    const { id, isdraft } = e.currentTarget.dataset
    if (isdraft) {
      wx.navigateTo({ url: `/pages/customer-form/customer-form?id=${id}` })
    } else {
      wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
    }
  },


  // 添加客户（管理员）
  addCustomer() {
    wx.navigateTo({ url: '/pages/customer-form/customer-form' })
  },

  // 编辑客户（管理员）
  editCustomer(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/customer-form/customer-form?id=${id}` })
  },

  // 删除客户（管理员）
  deleteCustomer(e) {
    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: `确定要删除客户"${name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({
              url: `/customers/${id}`,
              method: 'DELETE'
            })
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadStats()
            this.loadCustomers(true)
          } catch (err) {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          }
        }
      }
    })
  },


  uploadVoucher(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/voucher/voucher?id=${id}` })
  },

  // 入库操作
  markStorage(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认入库',
      content: '确定要将此车辆标记为已入库吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({
              url: `/customers/${id}`,
              method: 'PUT',
              data: { isCollected: '已入库', status: 'stored' }
            })
            wx.showToast({ title: '入库成功', icon: 'success' })
            this.loadStats()
            this.loadCustomers(true)
          } catch (err) {
            wx.showToast({ title: err.message || '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 出库操作
  markDelivery(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认出库',
      content: '确定要将此车辆标记为已出库吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({
              url: `/customers/${id}`,
              method: 'PUT',
              data: { isCollected: '未入库', status: 'pending' }
            })
            wx.showToast({ title: '出库成功', icon: 'success' })
            this.loadStats()
            this.loadCustomers(true)
          } catch (err) {
            wx.showToast({ title: err.message || '操作失败', icon: 'none' })
          }
        }
      }
    })
  }
})
