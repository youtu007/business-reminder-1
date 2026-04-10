const app = getApp()

Page({
  data: {
    id: '',
    isEdit: false,
    loading: false,
    submitting: false,
    salesmen: [],
    salesmenNames: ['请选择'],
    salesmanIndex: 0,
    archiveReceiverIndex: 0,
    banks: [],
    bankIndex: 0,
    bankOptions: ['请选择'],
    customerSources: [],
    sourceIndex: 0,
    sourceOptions: ['请选择'],
    collectionPlans: [],
    planIndex: 0,
    planOptions: ['请选择'],
    isCollectedOptions: ['未入库', '已入库'],
    isCollectedIndex: 0,
    isMortgageOptions: ['否', '是'],
    isMortgageIndex: 0,
    // 影像资料配置
    imageFields: [
      { key: 'idCardPhotos', label: '身份证正反面照片', required: true },
      { key: 'drivingLicense', label: '行驶证正副页', required: true },
      { key: 'fullPaymentPhoto', label: '全款车大本照片', required: false },
      { key: 'trafficViolation', label: '12123状态及违章情况照片', required: true },
      { key: 'assessmentScreenshot', label: '评估截图', required: true },
      { key: 'transferScreenshot', label: '转账截图', required: true },
      { key: 'mileagePhoto', label: '里程数照片', required: true },
      { key: 'vehicleArchive', label: '10万以上车辆查档截图', required: false },
      { key: 'executionQuery', label: '限搞执行查询照片', required: false },
      { key: 'contractPhoto', label: '手持合照+合同首页', required: true },
      { key: 'otherPhotos', label: '其他', required: false },
      { key: 'storagePhotos', label: '入库照片', required: false }
    ],
    expandedImages: {},
    form: {
      customerName: '',
      idCard: '',
      licensePlate: '',
      frameNumber: '',
      carBrand: '',
      customerAddress: '',
      customerPhone: '',
      salesmanId: '',
      archiveReceiver: '',
      customerSource: '',
      channelName: '',
      channelPhone: '',
      bankName: '',
      bankCardNumber: '',
      assessmentAmount: '',
      isMortgage: false,
      collectionAmount: '',
      collectionPlan: '',
      trialCalculation: '',
      monthlyRepayment: '',
      isCollected: '未入库',
      collector: '',
      applicationTime: '',
      expectedSaleTime: '',
      images: {
        idCardPhotos: [],
        drivingLicense: [],
        fullPaymentPhoto: [],
        trafficViolation: [],
        assessmentScreenshot: [],
        transferScreenshot: [],
        mileagePhoto: [],
        vehicleArchive: [],
        executionQuery: [],
        contractPhoto: [],
        otherPhotos: [],
        storagePhotos: []
      }
    }
  },

  onLoad(options) {
    if (!app.checkLogin() || !app.isAdmin()) {
      wx.showToast({ title: '无权限访问', icon: 'none' })
      wx.navigateBack()
      return
    }

    this.loadConfigs()
    this.loadSalesmen()

    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '信息编辑' })
      this.loadCustomer(options.id)
    } else {
      wx.setNavigationBarTitle({ title: '信息录入' })
    }
  },

  async loadConfigs() {
    try {
      const res = await app.request({ url: '/configs' })
      console.log('配置API返回:', res)
      const configs = res.data || {}
      console.log('解析后configs:', configs)

      const banks = configs.banks || []
      const customerSources = configs.customerSources || []
      const collectionPlans = configs.collectionPlans || []

      console.log('customerSources:', customerSources)

      // 处理收车方案（可能是对象数组或字符串数组）
      const planNames = collectionPlans.map(p => typeof p === 'object' ? p.name : p)

      this.setData({
        banks,
        customerSources,
        collectionPlans,
        // 预计算picker选项
        bankOptions: ['请选择', ...banks],
        sourceOptions: ['请选择', ...customerSources],
        planOptions: ['请选择', ...planNames]
      })
    } catch (err) {
      console.error('加载配置失败', err)
    }
  },

  async loadSalesmen() {
    try {
      const res = await app.request({ url: '/users?role=salesman' })
      const salesmen = res.data || []
      const salesmenNames = ['请选择'].concat(salesmen.map(s => s.name))
      this.setData({ salesmen, salesmenNames })
    } catch (err) {
      console.error('加载业务员列表失败', err)
    }
  },

  async loadCustomer(id) {
    this.setData({ loading: true })
    try {
      const res = await app.request({ url: `/customers/${id}` })
      const customer = res.data

      // 设置表单数据
      const form = {
        customerName: customer.customerName || '',
        idCard: customer.idCard || '',
        licensePlate: customer.licensePlate || '',
        frameNumber: customer.frameNumber || '',
        carBrand: customer.carBrand || '',
        customerAddress: customer.customerAddress || '',
        customerPhone: customer.customerPhone || '',
        salesmanId: customer.salesmanId?._id || customer.salesmanId || '',
        archiveReceiver: customer.archiveReceiver || '',
        customerSource: customer.customerSource || '',
        channelName: customer.channelName || '',
        channelPhone: customer.channelPhone || '',
        bankName: customer.bankName || '',
        bankCardNumber: customer.bankCardNumber || '',
        assessmentAmount: customer.assessmentAmount?.toString() || '',
        isMortgage: customer.isMortgage || false,
        collectionAmount: customer.collectionAmount?.toString() || '',
        collectionPlan: customer.collectionPlan || '',
        trialCalculation: customer.trialCalculation || '',
        monthlyRepayment: customer.monthlyRepayment?.toString() || '',
        isCollected: customer.isCollected || '未入库',
        collector: customer.collector || '',
        applicationTime: customer.applicationTime ? customer.applicationTime.split('T')[0] : '',
        expectedSaleTime: customer.expectedSaleTime ? customer.expectedSaleTime.split('T')[0] : '',
        images: customer.images || {
          idCardPhotos: [],
          drivingLicense: [],
          fullPaymentPhoto: [],
          trafficViolation: [],
          assessmentScreenshot: [],
          transferScreenshot: [],
          mileagePhoto: [],
          vehicleArchive: [],
          executionQuery: [],
          contractPhoto: [],
          otherPhotos: [],
          storagePhotos: []
        }
      }

      // 找到对应的选择器索引
      const salesmanIndex = this.data.salesmen.findIndex(s => s._id === form.salesmanId) + 1
      const archiveReceiverIndex = this.data.salesmen.findIndex(s => s.name === form.archiveReceiver) + 1
      const bankIndex = this.data.banks.indexOf(form.bankName) + 1
      const sourceIndex = this.data.customerSources.indexOf(form.customerSource) + 1
      // 收车方案可能是对象数组，需要按name匹配
      const planIndex = this.data.collectionPlans.findIndex(p => {
        const planName = typeof p === 'object' ? p.name : p
        return planName === form.collectionPlan
      }) + 1
      const isCollectedIndex = this.data.isCollectedOptions.indexOf(form.isCollected)
      const isMortgageIndex = form.isMortgage ? 1 : 0

      this.setData({
        form,
        salesmanIndex: salesmanIndex > 0 ? salesmanIndex : 0,
        archiveReceiverIndex: archiveReceiverIndex > 0 ? archiveReceiverIndex : 0,
        bankIndex: bankIndex > 0 ? bankIndex : 0,
        sourceIndex: sourceIndex > 0 ? sourceIndex : 0,
        planIndex: planIndex > 0 ? planIndex : 0,
        isCollectedIndex: isCollectedIndex >= 0 ? isCollectedIndex : 0,
        isMortgageIndex,
        loading: false
      })
    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      this.setData({ loading: false })
    }
  },

  // 表单输入处理
  onInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [`form.${field}`]: e.detail.value })

    // 收车金额变化时重新计算
    if (field === 'collectionAmount') {
      this.calculatePayment()
    }
  },

  // 业务员选择
  onSalesmanChange(e) {
    const index = parseInt(e.detail.value)
    const salesmanId = index === 0 ? '' : this.data.salesmen[index - 1]._id
    this.setData({
      salesmanIndex: index,
      'form.salesmanId': salesmanId
    })
  },

  // 档案收取员选择
  onArchiveReceiverChange(e) {
    const index = parseInt(e.detail.value)
    const archiveReceiver = index === 0 ? '' : this.data.salesmen[index - 1].name
    this.setData({
      archiveReceiverIndex: index,
      'form.archiveReceiver': archiveReceiver
    })
  },

  // 开户行选择
  onBankChange(e) {
    const index = e.detail.value
    const bankName = index == 0 ? '' : this.data.banks[index - 1]
    this.setData({
      bankIndex: index,
      'form.bankName': bankName
    })
  },

  // 客户来源选择
  onSourceChange(e) {
    const index = e.detail.value
    const customerSource = index == 0 ? '' : this.data.customerSources[index - 1]
    this.setData({
      sourceIndex: index,
      'form.customerSource': customerSource
    })
  },

  // 收车方案选择
  onPlanChange(e) {
    const index = e.detail.value
    const plan = index == 0 ? null : this.data.collectionPlans[index - 1]
    const planName = plan ? (typeof plan === 'object' ? plan.name : plan) : ''

    this.setData({
      planIndex: index,
      'form.collectionPlan': planName
    })

    // 自动计算试算和每月应还金额
    this.calculatePayment()
  },

  // 计算试算和每月应还金额
  calculatePayment() {
    const { collectionPlans, planIndex, form } = this.data
    const plan = planIndex > 0 ? collectionPlans[planIndex - 1] : null
    const collectionAmount = parseFloat(form.collectionAmount) || 0

    if (plan && typeof plan === 'object' && collectionAmount > 0) {
      // 试算 = 收车金额 * 费率 + 固定费用
      const trialCalculation = (collectionAmount * plan.rate + plan.fee).toFixed(2)
      // 每月应还金额 = 试算结果
      const monthlyRepayment = trialCalculation

      this.setData({
        'form.trialCalculation': trialCalculation,
        'form.monthlyRepayment': monthlyRepayment
      })
    }
  },

  // 是否收车选择
  onIsCollectedChange(e) {
    const index = e.detail.value
    this.setData({
      isCollectedIndex: index,
      'form.isCollected': this.data.isCollectedOptions[index]
    })
  },

  // 是否按揭选择
  onIsMortgageChange(e) {
    const index = e.detail.value
    this.setData({
      isMortgageIndex: index,
      'form.isMortgage': index == 1
    })
  },

  // 申请时间选择
  onApplicationTimeChange(e) {
    this.setData({ 'form.applicationTime': e.detail.value })
  },

  // 预计销售时间选择
  onExpectedSaleTimeChange(e) {
    this.setData({ 'form.expectedSaleTime': e.detail.value })
  },

  // 展开/收起影像资料
  toggleImageSection(e) {
    const { key } = e.currentTarget.dataset
    const expanded = this.data.expandedImages[key]
    this.setData({ [`expandedImages.${key}`]: !expanded })
  },

  // 选择图片
  chooseImage(e) {
    const { key } = e.currentTarget.dataset
    const currentImages = this.data.form.images[key] || []

    wx.chooseMedia({
      count: 9 - currentImages.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(f => f.tempFilePath)
        this.uploadImages(key, newImages)
      }
    })
  },

  // 上传图片
  async uploadImages(key, tempFilePaths) {
    wx.showLoading({ title: '上传中...' })

    try {
      const uploadedUrls = []
      for (const filePath of tempFilePaths) {
        const url = await this.uploadSingleImage(filePath)
        if (url) uploadedUrls.push(url)
      }

      const currentImages = this.data.form.images[key] || []
      this.setData({
        [`form.images.${key}`]: [...currentImages, ...uploadedUrls]
      })

      wx.hideLoading()
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
            // 如果是相对路径，拼接完整URL
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

  // 身份证OCR识别按钮点击
  recognizeIdCardOCR() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.doIdCardOCR(tempFilePath)
      }
    })
  },

  // 执行身份证OCR识别
  async doIdCardOCR(filePath) {
    wx.showLoading({ title: '识别中...' })

    try {
      // 上传图片并获取URL
      const imageUrl = await this.uploadSingleImage(filePath)

      // 同时添加到身份证照片列表
      const currentImages = this.data.form.images.idCardPhotos || []
      this.setData({
        [`form.images.idCardPhotos`]: [...currentImages, imageUrl]
      })

      // 调用后端OCR接口识别身份证
      const res = await app.request({
        url: '/ocr/idcard',
        method: 'POST',
        data: { imageUrl }
      })

      wx.hideLoading()

      if (res.data && (res.data.name || res.data.idNumber)) {
        // 识别成功，填入表单
        const updates = {}
        if (res.data.name) updates['form.customerName'] = res.data.name
        if (res.data.idNumber) updates['form.idCard'] = res.data.idNumber
        if (res.data.address) updates['form.customerAddress'] = res.data.address

        this.setData(updates)
        wx.showToast({ title: '识别成功', icon: 'success' })
      } else {
        wx.showToast({ title: '未能识别，请手动输入', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('身份证识别失败', err)
      wx.showToast({ title: '识别失败，请手动输入', icon: 'none' })
    }
  },

  // 银行卡OCR识别按钮点击
  recognizeBankCardOCR() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.doBankCardOCR(tempFilePath)
      }
    })
  },

  // 执行银行卡OCR识别
  async doBankCardOCR(filePath) {
    wx.showLoading({ title: '识别中...' })

    try {
      // 上传图片
      const imageUrl = await this.uploadSingleImage(filePath)

      // 调用后端OCR接口识别银行卡
      const res = await app.request({
        url: '/ocr/bankcard',
        method: 'POST',
        data: { imageUrl }
      })

      wx.hideLoading()

      if (res.data && res.data.cardNumber) {
        // 识别成功，填入表单
        this.setData({ 'form.bankCardNumber': res.data.cardNumber })
        if (res.data.bankName) {
          // 尝试匹配开户行
          const bankIndex = this.data.banks.indexOf(res.data.bankName)
          if (bankIndex >= 0) {
            this.setData({
              bankIndex: bankIndex + 1,
              'form.bankName': res.data.bankName
            })
          }
        }
        wx.showToast({ title: '识别成功', icon: 'success' })
      } else {
        wx.showToast({ title: '未能识别，请手动输入', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('银行卡识别失败', err)
      wx.showToast({ title: '识别失败，请手动输入', icon: 'none' })
    }
  },

  // 删除图片
  deleteImage(e) {
    const { key, index } = e.currentTarget.dataset
    const images = this.data.form.images[key] || []
    images.splice(index, 1)
    this.setData({ [`form.images.${key}`]: images })
  },

  // 预览图片
  previewImage(e) {
    const { key, url } = e.currentTarget.dataset
    const urls = this.data.form.images[key] || []
    wx.previewImage({ current: url, urls })
  },

  // 提交表单
  async handleSubmit(e) {
    const isDraft = e.currentTarget.dataset.draft === 'true'
    await this.saveForm(isDraft)
  },

  // 检查表单是否有内容
  hasFormContent() {
    const { form } = this.data
    // 检查文本字段
    const textFields = ['customerName', 'idCard', 'licensePlate', 'frameNumber', 'carBrand',
      'customerAddress', 'customerPhone', 'archiveReceiver', 'channelName', 'channelPhone',
      'bankCardNumber', 'assessmentAmount', 'collectionAmount', 'trialCalculation', 'collector',
      'applicationTime', 'expectedSaleTime']

    for (const field of textFields) {
      if (form[field] && form[field].toString().trim()) return true
    }

    // 检查选择字段
    if (form.salesmanId || form.customerSource || form.bankName || form.collectionPlan) return true

    // 检查图片
    const images = form.images || {}
    for (const key in images) {
      if (images[key] && images[key].length > 0) return true
    }

    return false
  },

  async saveForm(isDraft = false) {
    const { form, isEdit, id } = this.data

    if (isDraft) {
      // 草稿模式：编辑时直接允许保存，新建时需要有内容
      if (!isEdit && !this.hasFormContent()) {
        return wx.showToast({ title: '请至少填写一项内容', icon: 'none' })
      }
      // 草稿模式不验证必填项，直接保存
    } else {
      // 提交模式：验证必填字段
      if (!form.customerName) {
        return wx.showToast({ title: '请输入客户姓名', icon: 'none' })
      }
      if (!form.idCard) {
        return wx.showToast({ title: '请输入身份证号', icon: 'none' })
      }
      if (!form.frameNumber) {
        return wx.showToast({ title: '请输入车架号', icon: 'none' })
      }
      if (!form.carBrand) {
        return wx.showToast({ title: '请输入车品牌', icon: 'none' })
      }
      if (!form.customerAddress) {
        return wx.showToast({ title: '请输入客户地址', icon: 'none' })
      }
      if (!form.salesmanId) {
        return wx.showToast({ title: '请选择业务员', icon: 'none' })
      }
      if (!form.archiveReceiver) {
        return wx.showToast({ title: '请选择档案收取员', icon: 'none' })
      }
      if (!form.customerSource) {
        return wx.showToast({ title: '请选择客户来源', icon: 'none' })
      }
      if (!form.bankName) {
        return wx.showToast({ title: '请选择开户行', icon: 'none' })
      }
      if (!form.bankCardNumber) {
        return wx.showToast({ title: '请输入银行卡号', icon: 'none' })
      }
      if (!form.assessmentAmount) {
        return wx.showToast({ title: '请输入评估金额', icon: 'none' })
      }
      if (!form.collectionAmount) {
        return wx.showToast({ title: '请输入收车金额', icon: 'none' })
      }
      if (!form.collectionPlan) {
        return wx.showToast({ title: '请选择收车方案', icon: 'none' })
      }
      if (!form.collector) {
        return wx.showToast({ title: '请输入收车人', icon: 'none' })
      }

      // 验证必传图片
      const requiredImages = this.data.imageFields.filter(f => f.required)
      for (const field of requiredImages) {
        const images = form.images[field.key] || []
        if (images.length === 0) {
          return wx.showToast({ title: `请上传${field.label}`, icon: 'none' })
        }
      }
    }

    this.setData({ submitting: true })

    try {
      // 构建数据，清理空值
      const data = {
        ...form,
        isDraft: isDraft
      }

      // 处理数字字段
      data.assessmentAmount = form.assessmentAmount ? parseFloat(form.assessmentAmount) : undefined
      data.collectionAmount = form.collectionAmount ? parseFloat(form.collectionAmount) : undefined
      data.monthlyRepayment = form.monthlyRepayment ? parseFloat(form.monthlyRepayment) : undefined

      // 处理日期字段
      data.applicationTime = form.applicationTime || undefined
      data.expectedSaleTime = form.expectedSaleTime || undefined

      // 处理ObjectId字段，空字符串需要删除
      if (!form.salesmanId) {
        delete data.salesmanId
      }

      // 清理其他空字符串字段（草稿模式下）
      if (isDraft) {
        Object.keys(data).forEach(key => {
          if (data[key] === '' || data[key] === null) {
            delete data[key]
          }
        })
      }

      if (isEdit) {
        await app.request({
          url: `/customers/${id}`,
          method: 'PUT',
          data
        })
        wx.showToast({ title: isDraft ? '已保存草稿' : '更新成功', icon: 'success' })
      } else {
        await app.request({
          url: '/customers',
          method: 'POST',
          data
        })
        wx.showToast({ title: isDraft ? '已保存草稿' : '创建成功', icon: 'success' })
      }

      setTimeout(() => {
        // 返回首页
        wx.reLaunch({ url: '/pages/index/index' })
      }, 1500)
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
