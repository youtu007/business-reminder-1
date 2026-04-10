<template>
  <div class="customer-list">
    <el-card class="filter-card">
      <el-form :model="filters" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="姓名/身份证/车牌号/车架号"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable>
            <el-option label="未入库" value="pending" />
            <el-option label="已入库" value="stored" />
            <el-option label="逾期" value="overdue" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item label="逾期">
          <el-select v-model="filters.isOverdue" placeholder="全部" clearable>
            <el-option label="是" value="true" />
            <el-option label="否" value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务员">
          <el-select v-model="filters.salesmanId" placeholder="全部" clearable filterable>
            <el-option
              v-for="s in salesmen"
              :key="s._id"
              :label="s.name"
              :value="s._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>客户列表</span>
          <div>
            <el-button type="primary" @click="handleCreate">新增客户</el-button>
            <el-button @click="handleExport">导出Excel</el-button>
          </div>
        </div>
      </template>

      <el-table :data="customers" v-loading="loading" style="width: 100%">
        <el-table-column label="客户姓名" width="140" fixed>
          <template #default="{ row }">
            {{ row.customerName }}
            <el-tag v-if="row.isDraft" type="warning" size="small" style="margin-left: 4px">草稿</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="licensePlate" label="车牌号" width="110" />
        <el-table-column prop="carBrand" label="车品牌" width="100" />
        <el-table-column prop="assessmentAmount" label="评估金额(万)" width="100" />
        <el-table-column prop="collectionAmount" label="收车金额" width="100" />
        <el-table-column prop="monthlyRepayment" label="每期还款" width="100" />
        <el-table-column label="业务员" width="100">
          <template #default="{ row }">
            {{ row.salesmanId?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="isCollected" label="是否收车" width="90" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="逾期" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.isOverdue" type="danger">{{ row.overdueDays || 0 }}天</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row._id)">查看</el-button>
            <el-button type="primary" link @click="handleEdit(row._id)">编辑</el-button>
            <el-button type="primary" link @click="handleAssign(row)">分配</el-button>
            <el-popconfirm
              title="确定删除该客户吗？"
              @confirm="handleDelete(row._id)"
            >
              <template #reference>
                <el-button type="danger" link>删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 16px; justify-content: flex-end"
        @size-change="loadCustomers"
        @current-change="loadCustomers"
      />
    </el-card>

    <!-- 分配弹窗 -->
    <el-dialog v-model="assignDialogVisible" title="分配业务员" width="400px">
      <el-form :model="assignForm" label-width="80px">
        <el-form-item label="业务员">
          <el-select v-model="assignForm.salesmanId" filterable placeholder="请选择">
            <el-option
              v-for="s in salesmen"
              :key="s._id"
              :label="`${s.name} (${s.phone})`"
              :value="s._id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="assignForm.remark" type="textarea" rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="assignLoading" @click="submitAssign">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../../api'
import dayjs from 'dayjs'

const router = useRouter()

const loading = ref(false)
const customers = ref([])
const salesmen = ref([])

const filters = reactive({
  keyword: '',
  status: '',
  isOverdue: '',
  salesmanId: ''
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 分配相关
const assignDialogVisible = ref(false)
const assignLoading = ref(false)
const assignForm = reactive({
  customerId: '',
  salesmanId: '',
  remark: ''
})

onMounted(async () => {
  await loadSalesmen()
  await loadCustomers()
})

async function loadSalesmen() {
  try {
    const res = await api.users.getSalesmen()
    salesmen.value = res.data
  } catch (error) {
    console.error('获取业务员列表失败:', error)
  }
}

async function loadCustomers() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...filters
    }
    // 移除空值
    Object.keys(params).forEach(key => {
      if (params[key] === '') delete params[key]
    })

    const res = await api.customers.getList(params)
    customers.value = res.data
    pagination.total = res.pagination.total
  } catch (error) {
    console.error('获取客户列表失败:', error)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadCustomers()
}

function handleReset() {
  Object.assign(filters, {
    keyword: '',
    status: '',
    isOverdue: '',
    salesmanId: ''
  })
  pagination.page = 1
  loadCustomers()
}

function handleCreate() {
  router.push('/customers/create')
}

function handleEdit(id) {
  router.push(`/customers/${id}/edit`)
}

function viewDetail(id) {
  router.push(`/customers/${id}`)
}

function handleAssign(customer) {
  assignForm.customerId = customer._id
  assignForm.salesmanId = customer.salesmanId?._id || ''
  assignForm.remark = ''
  assignDialogVisible.value = true
}

async function submitAssign() {
  if (!assignForm.salesmanId) {
    ElMessage.warning('请选择业务员')
    return
  }

  assignLoading.value = true
  try {
    await api.customers.assign(assignForm.customerId, {
      salesmanId: assignForm.salesmanId,
      remark: assignForm.remark
    })
    ElMessage.success('分配成功')
    assignDialogVisible.value = false
    loadCustomers()
  } catch (error) {
    console.error('分配失败:', error)
  } finally {
    assignLoading.value = false
  }
}

async function handleDelete(id) {
  try {
    await api.customers.delete(id)
    ElMessage.success('删除成功')
    loadCustomers()
  } catch (error) {
    console.error('删除失败:', error)
  }
}

async function handleExport() {
  try {
    const res = await api.export.customers(filters)
    const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers_${dayjs().format('YYYYMMDD')}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
  }
}

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

function getStatusType(status) {
  const types = {
    pending: 'warning',
    stored: 'success',
    overdue: 'danger',
    completed: 'info'
  }
  return types[status] || 'info'
}

function getStatusText(status) {
  const texts = {
    pending: '未入库',
    stored: '已入库',
    overdue: '逾期',
    completed: '已完成'
  }
  return texts[status] || status
}
</script>

<style scoped>
.filter-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
