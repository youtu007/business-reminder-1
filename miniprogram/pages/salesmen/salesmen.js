const app = getApp()

Page({
  data: {
    salesmen: [],
    loading: false,
    showForm: false,
    editingId: '',
    form: {
      name: '',
      phone: ''
    },
    submitting: false
  },

  onLoad() {
    if (!app.checkLogin() || !app.isAdmin()) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      wx.navigateBack()
      return
    }
    this.loadSalesmen()
  },

  onShow() {
    if (app.globalData.token && app.isAdmin()) {
      this.loadSalesmen()
    }
  },

  async loadSalesmen() {
    this.setData({ loading: true })
    try {
      const res = await app.request({ url: '/users?role=salesman' })
      this.setData({ salesmen: res.data || [], loading: false })
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  // 显示添加表单
  showAddForm() {
    this.setData({
      showForm: true,
      editingId: '',
      form: { name: '', phone: '' }
    })
  },

  // 显示编辑表单
  showEditForm(e) {
    const { id, name, phone } = e.currentTarget.dataset
    this.setData({
      showForm: true,
      editingId: id,
      form: { name, phone }
    })
  },

  // 关闭表单
  hideForm() {
    this.setData({ showForm: false, editingId: '', form: { name: '', phone: '' } })
  },

  // 表单输入
  onInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  // 提交表单
  async handleSubmit() {
    const { form, editingId } = this.data

    if (!form.name) {
      return wx.showToast({ title: '请输入姓名', icon: 'none' })
    }
    if (!form.phone || !/^1[3-9]\d{9}$/.test(form.phone)) {
      return wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
    }

    this.setData({ submitting: true })

    try {
      if (editingId) {
        // 编辑
        await app.request({
          url: `/users/${editingId}`,
          method: 'PUT',
          data: form
        })
        wx.showToast({ title: '更新成功', icon: 'success' })
      } else {
        // 添加
        await app.request({
          url: '/users',
          method: 'POST',
          data: {
            ...form,
            role: 'salesman'
          }
        })
        wx.showToast({ title: '添加成功', icon: 'success' })
      }
      // 先关闭弹窗，再刷新列表
      this.hideForm()
      await this.loadSalesmen()
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  // 切换状态
  toggleStatus(e) {
    const { id, status, name } = e.currentTarget.dataset
    const newStatus = status === 'active' ? 'inactive' : 'active'
    const action = newStatus === 'active' ? '启用' : '禁用'

    wx.showModal({
      title: '确认操作',
      content: `确定要${action}业务员"${name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({
              url: `/users/${id}`,
              method: 'PUT',
              data: { status: newStatus }
            })
            wx.showToast({ title: `${action}成功`, icon: 'success' })
            this.loadSalesmen()
          } catch (err) {
            wx.showToast({ title: err.message || '操作失败', icon: 'none' })
          }
        }
      }
    })
  },

  // 删除
  deleteSalesman(e) {
    const { id, name } = e.currentTarget.dataset

    wx.showModal({
      title: '确认删除',
      content: `确定要删除业务员"${name}"吗？此操作不可恢复`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({
              url: `/users/${id}`,
              method: 'DELETE'
            })
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadSalesmen()
          } catch (err) {
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})
