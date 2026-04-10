/**
 * 工具函数
 */

// 格式化日期
const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return ''

  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

// 格式化时间戳
const formatTime = (timestamp) => {
  return formatDate(timestamp, 'YYYY-MM-DD HH:mm:ss')
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    pending: '未入库',
    stored: '已入库',
    overdue: '逾期',
    completed: '已完成'
  }
  return statusMap[status] || status
}

// 获取状态颜色类名
const getStatusClass = (status, isOverdue) => {
  if (isOverdue) return 'tag-danger'

  const classMap = {
    pending: 'tag-warning',
    stored: 'tag-success',
    overdue: 'tag-danger',
    completed: 'tag-info'
  }
  return classMap[status] || 'tag-info'
}

// 防抖
const debounce = (fn, delay = 300) => {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

// 节流
const throttle = (fn, delay = 300) => {
  let last = 0
  return function (...args) {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn.apply(this, args)
    }
  }
}

module.exports = {
  formatDate,
  formatTime,
  getStatusText,
  getStatusClass,
  debounce,
  throttle
}
