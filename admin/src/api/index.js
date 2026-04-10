import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000
})

// 请求拦截器
instance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器
instance.interceptors.response.use(
  response => response.data,
  error => {
    const message = error.response?.data?.message || '请求失败'
    ElMessage.error(message)

    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/login')
    }

    return Promise.reject(error)
  }
)

export default {
  auth: {
    adminLogin: (username, password) =>
      instance.post('/auth/admin/login', { username, password }),
    getProfile: () => instance.get('/auth/profile')
  },

  users: {
    getList: params => instance.get('/users', { params }),
    getSalesmen: () => instance.get('/users/salesmen'),
    create: data => instance.post('/users', data),
    update: (id, data) => instance.put(`/users/${id}`, data),
    delete: id => instance.delete(`/users/${id}`)
  },

  customers: {
    getList: params => instance.get('/customers', { params }),
    getDetail: id => instance.get(`/customers/${id}`),
    create: data => instance.post('/customers', data),
    update: (id, data) => instance.put(`/customers/${id}`, data),
    delete: id => instance.delete(`/customers/${id}`),
    assign: (id, data) => instance.post(`/customers/${id}/assign`, data),
    getAssignmentLogs: id => instance.get(`/customers/${id}/assignment-logs`),
    getStats: () => instance.get('/customers/stats/overview'),
    getRepaymentPlans: id => instance.get(`/customers/${id}/repayment-plans`),
    generateRepaymentPlans: id => instance.post(`/customers/${id}/repayment-plans/generate`),
    recordPayment: (id, planId, data) => instance.put(`/customers/${id}/repayment-plans/${planId}/pay`, data),
    getRepaymentSummary: id => instance.get(`/customers/${id}/repayment-summary`)
  },

  upload: {
    single: file => {
      const formData = new FormData()
      formData.append('file', file)
      return instance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    multiple: files => {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      return instance.post('/upload/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    }
  },

  overdueRules: {
    getList: () => instance.get('/overdue-rules'),
    getDetail: id => instance.get(`/overdue-rules/${id}`),
    create: data => instance.post('/overdue-rules', data),
    update: (id, data) => instance.put(`/overdue-rules/${id}`, data),
    delete: id => instance.delete(`/overdue-rules/${id}`)
  },

  configs: {
    getAll: () => instance.get('/configs'),
    update: (key, value) => instance.put(`/configs/${key}`, { value })
  },

  export: {
    customers: params => instance.get('/export/customers', {
      params,
      responseType: 'blob'
    })
  }
}
