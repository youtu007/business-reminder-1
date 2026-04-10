<template>
  <div class="customer-detail" v-loading="loading">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>客户详情</span>
          <div>
            <el-button type="primary" @click="handleEdit">编辑</el-button>
            <el-button @click="router.back()">返回</el-button>
          </div>
        </div>
      </template>

      <!-- 基本信息 -->
      <el-descriptions title="基本信息" :column="3" border>
        <el-descriptions-item label="客户姓名">{{ customer.customerName }}</el-descriptions-item>
        <el-descriptions-item label="身份证">{{ customer.idCard }}</el-descriptions-item>
        <el-descriptions-item label="客户电话">{{ customer.customerPhone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="车牌号">{{ customer.licensePlate || '-' }}</el-descriptions-item>
        <el-descriptions-item label="车架号">{{ customer.frameNumber }}</el-descriptions-item>
        <el-descriptions-item label="车品牌">{{ customer.carBrand }}</el-descriptions-item>
        <el-descriptions-item label="客户地址" :span="3">{{ customer.customerAddress }}</el-descriptions-item>
        <el-descriptions-item label="业务员">
          {{ customer.salesmanId?.name || '-' }}
          ({{ customer.salesmanId?.phone || '-' }})
        </el-descriptions-item>
        <el-descriptions-item label="档案收取员">{{ customer.archiveReceiver }}</el-descriptions-item>
        <el-descriptions-item label="客户来源">{{ customer.customerSource }}</el-descriptions-item>
        <el-descriptions-item label="渠道名称">{{ customer.channelName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="渠道电话">{{ customer.channelPhone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="开户行">{{ customer.bankName }}</el-descriptions-item>
        <el-descriptions-item label="银行卡号">{{ customer.bankCardNumber }}</el-descriptions-item>
      </el-descriptions>

      <!-- 车辆信息 -->
      <el-descriptions title="车辆信息" :column="3" border style="margin-top: 20px">
        <el-descriptions-item label="评估金额">{{ customer.assessmentAmount }} 万元</el-descriptions-item>
        <el-descriptions-item label="是否按揭">{{ customer.isMortgage ? '是' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="收车金额">{{ customer.collectionAmount }}</el-descriptions-item>
        <el-descriptions-item label="收车方案">{{ customer.collectionPlan }}</el-descriptions-item>
        <el-descriptions-item label="试算">{{ customer.trialCalculation || '-' }}</el-descriptions-item>
        <el-descriptions-item label="每期还款额">{{ customer.monthlyRepayment || '-' }}</el-descriptions-item>
        <el-descriptions-item label="是否收车">{{ customer.isCollected }}</el-descriptions-item>
        <el-descriptions-item label="收车人">{{ customer.collector }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ formatDate(customer.applicationTime) }}</el-descriptions-item>
        <el-descriptions-item label="预计销售时间">{{ formatDate(customer.expectedSaleTime) }}</el-descriptions-item>
      </el-descriptions>

      <!-- 状态信息 -->
      <el-descriptions title="状态信息" :column="3" border style="margin-top: 20px">
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(customer.status)">
            {{ getStatusText(customer.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="是否逾期">
          <el-tag v-if="customer.isOverdue" type="danger">是</el-tag>
          <span v-else>否</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="customer.isOverdue" label="逾期天数">
          <span style="color: #f56c6c; font-weight: bold">{{ customer.overdueDays || 0 }} 天</span>
        </el-descriptions-item>
        <el-descriptions-item label="逾期原因">{{ customer.overdueReason || '-' }}</el-descriptions-item>
        <el-descriptions-item v-if="customer.status === 'completed'" label="结清时间">
          <span style="color: #67c23a; font-weight: bold">{{ formatDateTime(customer.completedAt) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(customer.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatDateTime(customer.updatedAt) }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ customer.createdBy?.name || '-' }}</el-descriptions-item>
      </el-descriptions>

      <!-- 影像资料 -->
      <div class="images-section" style="margin-top: 20px">
        <h4>影像资料</h4>
        <el-tabs>
          <el-tab-pane label="身份证照片">
            <ImagePreview :images="customer.images?.idCardPhotos" />
          </el-tab-pane>
          <el-tab-pane label="行驶证">
            <ImagePreview :images="customer.images?.drivingLicense" />
          </el-tab-pane>
          <el-tab-pane label="全款车大本">
            <ImagePreview :images="customer.images?.fullPaymentPhoto" />
          </el-tab-pane>
          <el-tab-pane label="违章情况">
            <ImagePreview :images="customer.images?.trafficViolation" />
          </el-tab-pane>
          <el-tab-pane label="评估截图">
            <ImagePreview :images="customer.images?.assessmentScreenshot" />
          </el-tab-pane>
          <el-tab-pane label="转账截图">
            <ImagePreview :images="customer.images?.transferScreenshot" />
          </el-tab-pane>
          <el-tab-pane label="里程数照片">
            <ImagePreview :images="customer.images?.mileagePhoto" />
          </el-tab-pane>
          <el-tab-pane label="手持合照+合同">
            <ImagePreview :images="customer.images?.contractPhoto" />
          </el-tab-pane>
          <el-tab-pane label="放款凭证">
            <ImagePreview :images="customer.images?.voucherPhotos" />
          </el-tab-pane>
          <el-tab-pane label="入库照片">
            <ImagePreview :images="customer.images?.storagePhotos" />
          </el-tab-pane>
          <el-tab-pane label="其他照片">
            <ImagePreview :images="customer.images?.otherPhotos" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>

    <!-- 还款计划 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>还款计划（销售计划）</span>
          <el-button type="primary" size="small" @click="generatePlan" :loading="generateLoading">
            生成还款计划
          </el-button>
        </div>
      </template>

      <el-table :data="repaymentPlans" border stripe v-if="repaymentPlans.length">
        <el-table-column prop="period" label="期数" width="70" align="center">
          <template #default="{ row }">第{{ row.period }}期</template>
        </el-table-column>
        <el-table-column label="还款日期" width="120" align="center">
          <template #default="{ row }">{{ formatDate(row.dueDate) }}</template>
        </el-table-column>
        <el-table-column label="应还金额" width="120" align="center">
          <template #default="{ row }">{{ row.expectedAmount.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="已还金额" width="120" align="center">
          <template #default="{ row }">{{ row.paidAmount > 0 ? row.paidAmount.toFixed(2) : '-' }}</template>
        </el-table-column>
        <el-table-column label="利息" width="100" align="center">
          <template #default="{ row }">{{ row.interest !== null ? row.interest.toFixed(2) : '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getPlanStatusType(row.status)">{{ getPlanStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="逾期天数" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.overdueDays > 0" style="color: #f56c6c">{{ row.overdueDays }}天</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="还款时间" width="120" align="center">
          <template #default="{ row }">{{ row.paidAt ? formatDate(row.paidAt) : '-' }}</template>
        </el-table-column>
        <el-table-column label="备注" min-width="100">
          <template #default="{ row }">{{ row.remark || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'paid'"
              type="primary"
              size="small"
              link
              @click="showPayDialog(row)"
            >
              确认还款
            </el-button>
            <span v-else style="color: #67c23a">已还</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无还款计划，请点击右上角生成" />
    </el-card>

    <!-- 分配记录 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <span>分配记录</span>
      </template>
      <el-timeline>
        <el-timeline-item
          v-for="log in assignmentLogs"
          :key="log._id"
          :timestamp="formatDateTime(log.createdAt)"
          placement="top"
        >
          <el-card>
            <p>
              <strong>{{ log.operatorId?.name }}</strong>
              将客户从
              <strong>{{ log.fromSalesmanId?.name || '无' }}</strong>
              分配给
              <strong>{{ log.toSalesmanId?.name }}</strong>
            </p>
            <p v-if="log.remark" style="color: #909399; margin-top: 8px">
              备注: {{ log.remark }}
            </p>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-if="!assignmentLogs.length" description="暂无分配记录" />
    </el-card>

    <!-- 确认还款弹窗 -->
    <el-dialog v-model="payDialogVisible" title="确认还款" width="450px">
      <el-form :model="payForm" label-width="100px">
        <el-form-item label="期数">
          <span>第{{ currentPlan?.period }}期</span>
        </el-form-item>
        <el-form-item label="应还金额">
          <span>{{ currentPlan?.expectedAmount?.toFixed(2) }} 元</span>
          <span v-if="currentPlan?.paidAmount > 0" style="margin-left: 10px; color: #e6a23c">
            (已还 {{ currentPlan.paidAmount.toFixed(2) }} 元)
          </span>
        </el-form-item>
        <el-form-item label="本次还款" required>
          <el-input-number v-model="payForm.actualAmount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="利息">
          <el-input-number v-model="payForm.interest" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="payForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="payDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPayment" :loading="payLoading">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../../api'
import dayjs from 'dayjs'
import ImagePreview from '../../components/ImagePreview.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const customer = ref({})
const assignmentLogs = ref([])
const repaymentPlans = ref([])
const generateLoading = ref(false)

// 还款弹窗
const payDialogVisible = ref(false)
const payLoading = ref(false)
const currentPlan = ref(null)
const payForm = reactive({
  actualAmount: 0,
  interest: 0,
  remark: ''
})

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const [customerRes, logsRes, plansRes] = await Promise.all([
      api.customers.getDetail(route.params.id),
      api.customers.getAssignmentLogs(route.params.id),
      api.customers.getRepaymentPlans(route.params.id)
    ])
    customer.value = customerRes.data
    assignmentLogs.value = logsRes.data
    repaymentPlans.value = plansRes.data
  } catch (error) {
    console.error('获取数据失败:', error)
  } finally {
    loading.value = false
  }
}

async function generatePlan() {
  try {
    if (repaymentPlans.value.length > 0) {
      await ElMessageBox.confirm('重新生成将覆盖现有还款计划，是否继续？', '提示', {
        type: 'warning'
      })
    }
    generateLoading.value = true
    const res = await api.customers.generateRepaymentPlans(route.params.id)
    ElMessage.success(res.message)
    // 刷新还款计划
    const plansRes = await api.customers.getRepaymentPlans(route.params.id)
    repaymentPlans.value = plansRes.data
  } catch (error) {
    if (error !== 'cancel') {
      console.error('生成还款计划失败:', error)
    }
  } finally {
    generateLoading.value = false
  }
}

function showPayDialog(plan) {
  currentPlan.value = plan
  payForm.actualAmount = Math.max(0, plan.expectedAmount - (plan.paidAmount || 0))
  payForm.interest = 0
  payForm.remark = ''
  payDialogVisible.value = true
}

async function submitPayment() {
  if (!payForm.actualAmount && payForm.actualAmount !== 0) {
    ElMessage.warning('请输入实还金额')
    return
  }
  payLoading.value = true
  try {
    await api.customers.recordPayment(
      route.params.id,
      currentPlan.value._id,
      payForm
    )
    ElMessage.success('还款确认成功')
    payDialogVisible.value = false
    // 刷新数据
    await loadData()
  } catch (error) {
    console.error('确认还款失败:', error)
  } finally {
    payLoading.value = false
  }
}

function handleEdit() {
  router.push(`/customers/${route.params.id}/edit`)
}

function formatDate(date) {
  return date ? dayjs(date).format('YYYY-MM-DD') : '-'
}

function formatDateTime(date) {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
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

function getPlanStatusType(status) {
  const types = { pending: 'warning', partial: 'warning', paid: 'success', overdue: 'danger' }
  return types[status] || 'info'
}

function getPlanStatusText(status) {
  const texts = { pending: '待还款', partial: '部分还款', paid: '已还款', overdue: '逾期' }
  return texts[status] || status
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.images-section h4 {
  margin-bottom: 10px;
}
</style>
