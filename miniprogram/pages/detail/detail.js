const app = getApp()

Page({
  data: {
    customer: null,
    repaymentPlans: [],
    loading: true,
    isAdmin: false,
    showPayDialog: false,
    currentPlan: null,
    payAmount: '',
    payInterest: '',
    payRemark: '',
    payLoading: false,
    activeImageTab: 'idCardPhotos',
    imageTabs: [
      { key: 'idCardPhotos', label: '身份证' },
      { key: 'drivingLicense', label: '行驶证' },
      { key: 'trafficViolation', label: '违章' },
      { key: 'assessmentScreenshot', label: '评估' },
      { key: 'transferScreenshot', label: '转账' },
      { key: 'mileagePhoto', label: '里程' },
      { key: 'contractPhoto', label: '合同' },
      { key: 'voucherPhotos', label: '放款凭证' },
      { key: 'storagePhotos', label: '入库' },
      { key: 'otherPhotos', label: '其他' }
    ]
  },

  onLoad(options) {
    if (!app.checkLogin()) return
    this.setData({ isAdmin: app.isAdmin() })
    if (options.id) {
      this.customerId = options.id
      this.loadData(options.id)
    }
  },

  async loadData(id) {
    this.setData({ loading: true })
    try {
      const [customerRes, plansRes] = await Promise.all([
        app.request({ url: `/customers/${id}` }),
        app.request({ url: `/customers/${id}/repayment-plans` })
      ])

      // 格式化还款计划日期
      const plans = (plansRes.data || []).map(p => ({
        ...p,
        dueDateFormatted: p.dueDate ? p.dueDate.substring(0, 10) : '-',
        statusText: this.getPlanStatusText(p.status),
        statusClass: this.getPlanStatusClass(p.status)
      }))

      // 格式化客户结清时间
      const customerData = customerRes.data
      if (customerData.completedAt) {
        const d = new Date(customerData.completedAt)
        const pad = n => n < 10 ? '0' + n : n
        customerData.completedAtFormatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
      }

      this.setData({
        customer: customerData,
        repaymentPlans: plans,
        loading: false
      })
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  getPlanStatusText(status) {
    const map = { pending: '待销售', partial: '部分还款', paid: '已销售', overdue: '逾期待销售' }
    return map[status] || status
  },

  getPlanStatusClass(status) {
    const map = { pending: 'plan-status-pending', partial: 'plan-status-partial', paid: 'plan-status-paid', overdue: 'plan-status-overdue' }
    return map[status] || ''
  },

  onImageTabChange(e) {
    this.setData({ activeImageTab: e.currentTarget.dataset.key })
  },

  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset
    if (urls && urls.length > 0) {
      wx.previewImage({ current, urls })
    }
  },

  callPhone(e) {
    const { phone } = e.currentTarget.dataset
    if (phone) {
      wx.makePhoneCall({ phoneNumber: phone })
    }
  },

  // 点击还款计划行
  onPlanTap(e) {
    const plan = e.currentTarget.dataset.plan
    if (plan.status === 'paid') {
      wx.showToast({ title: '该期已还清', icon: 'none' })
      return
    }
    const remaining = Math.max(0, plan.expectedAmount - (plan.paidAmount || 0))
    this.setData({
      showPayDialog: true,
      currentPlan: plan,
      payAmount: String(remaining),
      payInterest: '',
      payRemark: ''
    })
  },

  closePayDialog() {
    this.setData({ showPayDialog: false })
  },

  onPayAmountInput(e) { this.setData({ payAmount: e.detail.value }) },
  onPayInterestInput(e) { this.setData({ payInterest: e.detail.value }) },
  onPayRemarkInput(e) { this.setData({ payRemark: e.detail.value }) },

  async submitPayment() {
    const amount = parseFloat(this.data.payAmount)
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入还款金额', icon: 'none' })
      return
    }
    this.setData({ payLoading: true })
    try {
      await app.request({
        url: `/customers/${this.customerId}/repayment-plans/${this.data.currentPlan._id}/pay`,
        method: 'PUT',
        data: {
          actualAmount: amount,
          interest: parseFloat(this.data.payInterest) || 0,
          remark: this.data.payRemark || ''
        }
      })
      wx.showToast({ title: '还款成功', icon: 'success' })
      this.setData({ showPayDialog: false })
      this.loadData(this.customerId)
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    } finally {
      this.setData({ payLoading: false })
    }
  },

  // 标记完结
  async completeCustomer() {
    const res = await wx.showModal({ title: '确认完结', content: '标记该客户为已完结？完结后仍可查看资料。' })
    if (!res.confirm) return
    try {
      await app.request({
        url: `/customers/${this.customerId}`,
        method: 'PUT',
        data: { status: 'completed', isOverdue: false, overdueDays: 0, overdueReason: '' }
      })
      wx.showToast({ title: '已完结', icon: 'success' })
      this.loadData(this.customerId)
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' })
    }
  },

  // 编辑客户（管理员）
  editCustomer() {
    if (this.customerId) {
      wx.navigateTo({ url: `/pages/customer-form/customer-form?id=${this.customerId}` })
    }
  },

  onShow() {
    // 返回时刷新数据
    if (this.customerId && app.globalData.token) {
      this.loadData(this.customerId)
    }
  }
})
