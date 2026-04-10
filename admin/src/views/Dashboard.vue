<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #409eff">
              <el-icon size="24"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">客户总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #e6a23c">
              <el-icon size="24"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pending }}</div>
              <div class="stat-label">未入库</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #67c23a">
              <el-icon size="24"><Box /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.stored }}</div>
              <div class="stat-label">已入库</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #f56c6c">
              <el-icon size="24"><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.overdue }}</div>
              <div class="stat-label">逾期客户</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>
            <span>最近逾期客户</span>
          </template>
          <el-table :data="overdueCustomers" style="width: 100%">
            <el-table-column prop="customerName" label="客户姓名" width="120" />
            <el-table-column prop="licensePlate" label="车牌号" width="120" />
            <el-table-column prop="carBrand" label="车品牌" width="120" />
            <el-table-column prop="salesmanId.name" label="业务员" width="100" />
            <el-table-column prop="overdueReason" label="逾期原因" />
            <el-table-column prop="createdAt" label="创建时间" width="180">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="viewDetail(row._id)">
                  查看
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { User, Clock, Box, Warning } from '@element-plus/icons-vue'
import api from '../api'
import dayjs from 'dayjs'

const router = useRouter()

const stats = ref({
  total: 0,
  pending: 0,
  stored: 0,
  overdue: 0,
  completed: 0
})

const overdueCustomers = ref([])

onMounted(async () => {
  try {
    const [statsRes, customersRes] = await Promise.all([
      api.customers.getStats(),
      api.customers.getList({ isOverdue: true, limit: 10 })
    ])
    stats.value = statsRes.data
    overdueCustomers.value = customersRes.data
  } catch (error) {
    console.error('获取数据失败:', error)
  }
})

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

function viewDetail(id) {
  router.push(`/customers/${id}`)
}
</script>

<style scoped>
.stat-card {
  cursor: pointer;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}
</style>
