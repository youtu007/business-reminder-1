<template>
  <div class="customer-form">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ isEdit ? '编辑客户' : '新增客户' }}</span>
          <el-button @click="router.back()">返回</el-button>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        v-loading="loading"
      >
        <!-- 基本信息 -->
        <el-divider content-position="left">基本信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="客户姓名" prop="customerName">
              <el-input v-model="form.customerName" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="身份证" prop="idCard">
              <el-input v-model="form.idCard" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客户电话">
              <el-input v-model="form.customerPhone" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="车牌号">
              <el-input v-model="form.licensePlate" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="车架号" prop="frameNumber">
              <el-input v-model="form.frameNumber" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="车品牌" prop="carBrand">
              <el-input v-model="form.carBrand" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="16">
            <el-form-item label="客户地址" prop="customerAddress">
              <el-input v-model="form.customerAddress" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="业务员" prop="salesmanId">
              <el-select v-model="form.salesmanId" filterable placeholder="请选择">
                <el-option
                  v-for="s in salesmen"
                  :key="s._id"
                  :label="`${s.name} (${s.phone})`"
                  :value="s._id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="档案收取员" prop="archiveReceiver">
              <el-input v-model="form.archiveReceiver" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="客户来源" prop="customerSource">
              <el-select v-model="form.customerSource" placeholder="请选择">
                <el-option
                  v-for="s in configs.customerSources"
                  :key="s"
                  :label="s"
                  :value="s"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="渠道名称">
              <el-input v-model="form.channelName" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="渠道电话">
              <el-input v-model="form.channelPhone" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="开户行" prop="bankName">
              <el-select v-model="form.bankName" filterable placeholder="请选择">
                <el-option
                  v-for="b in configs.banks"
                  :key="b"
                  :label="b"
                  :value="b"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="银行卡号" prop="bankCardNumber">
              <el-input v-model="form.bankCardNumber" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 车辆信息 -->
        <el-divider content-position="left">车辆信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="评估金额(万元)" prop="assessmentAmount">
              <el-input-number v-model="form.assessmentAmount" :min="0" :precision="2" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="是否按揭" prop="isMortgage">
              <el-radio-group v-model="form.isMortgage">
                <el-radio :value="true">是</el-radio>
                <el-radio :value="false">否</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="收车金额" prop="collectionAmount">
              <el-input-number v-model="form.collectionAmount" :min="0" :precision="2" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="收车方案" prop="collectionPlan">
              <el-select v-model="form.collectionPlan" placeholder="请选择">
                <el-option
                  v-for="p in configs.collectionPlans"
                  :key="p"
                  :label="p"
                  :value="p"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="试算">
              <el-input v-model="form.trialCalculation" disabled />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="每期还款额">
              <el-input-number v-model="form.monthlyRepayment" :min="0" :precision="2" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="是否收车" prop="isCollected">
              <el-select v-model="form.isCollected" placeholder="请选择">
                <el-option label="未入库" value="未入库" />
                <el-option label="已入库" value="已入库" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="收车人" prop="collector">
              <el-input v-model="form.collector" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="申请时间">
              <el-date-picker v-model="form.applicationTime" type="date" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="预计销售时间">
              <el-date-picker v-model="form.expectedSaleTime" type="date" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 影像资料 -->
        <el-divider content-position="left">影像资料</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="身份证照片" prop="images.idCardPhotos">
              <ImageUploader v-model="form.images.idCardPhotos" :limit="2" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="行驶证" prop="images.drivingLicense">
              <ImageUploader v-model="form.images.drivingLicense" :limit="2" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="全款车大本">
              <ImageUploader v-model="form.images.fullPaymentPhoto" :limit="2" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="12123违章情况" prop="images.trafficViolation">
              <ImageUploader v-model="form.images.trafficViolation" :limit="3" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="评估截图" prop="images.assessmentScreenshot">
              <ImageUploader v-model="form.images.assessmentScreenshot" :limit="3" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="转账截图" prop="images.transferScreenshot">
              <ImageUploader v-model="form.images.transferScreenshot" :limit="3" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="里程数照片" prop="images.mileagePhoto">
              <ImageUploader v-model="form.images.mileagePhoto" :limit="2" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="车辆查档截图">
              <ImageUploader v-model="form.images.vehicleArchive" :limit="3" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="限高执行查询">
              <ImageUploader v-model="form.images.executionQuery" :limit="3" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手持合照+合同" prop="images.contractPhoto">
              <ImageUploader v-model="form.images.contractPhoto" :limit="3" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入库照片">
              <ImageUploader v-model="form.images.storagePhotos" :limit="5" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="其他照片">
              <ImageUploader v-model="form.images.otherPhotos" :limit="5" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 提交按钮 -->
        <el-form-item style="margin-top: 20px">
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ isEdit ? '保存' : '提交' }}
          </el-button>
          <el-button @click="handleSaveDraft" :loading="submitting">保存草稿</el-button>
          <el-button @click="router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../../api'
import ImageUploader from '../../components/ImageUploader.vue'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const submitting = ref(false)
const formRef = ref()

const salesmen = ref([])
const configs = ref({
  banks: [],
  customerSources: [],
  collectionPlans: []
})

const form = reactive({
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
  assessmentAmount: 0,
  isMortgage: false,
  collectionAmount: 0,
  collectionPlan: '',
  trialCalculation: '',
  monthlyRepayment: 0,
  isCollected: '未入库',
  collector: '',
  applicationTime: null,
  expectedSaleTime: null,
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
})

const rules = {
  customerName: [{ required: true, message: '请输入客户姓名', trigger: 'blur' }],
  idCard: [{ required: true, message: '请输入身份证', trigger: 'blur' }],
  frameNumber: [{ required: true, message: '请输入车架号', trigger: 'blur' }],
  carBrand: [{ required: true, message: '请输入车品牌', trigger: 'blur' }],
  customerAddress: [{ required: true, message: '请输入客户地址', trigger: 'blur' }],
  salesmanId: [{ required: true, message: '请选择业务员', trigger: 'change' }],
  archiveReceiver: [{ required: true, message: '请输入档案收取员', trigger: 'blur' }],
  customerSource: [{ required: true, message: '请选择客户来源', trigger: 'change' }],
  bankName: [{ required: true, message: '请选择开户行', trigger: 'change' }],
  bankCardNumber: [{ required: true, message: '请输入银行卡号', trigger: 'blur' }],
  assessmentAmount: [{ required: true, message: '请输入评估金额', trigger: 'blur' }],
  isMortgage: [{ required: true, message: '请选择是否按揭', trigger: 'change' }],
  collectionAmount: [{ required: true, message: '请输入收车金额', trigger: 'blur' }],
  collectionPlan: [{ required: true, message: '请选择收车方案', trigger: 'change' }],
  isCollected: [{ required: true, message: '请选择是否收车', trigger: 'change' }],
  collector: [{ required: true, message: '请输入收车人', trigger: 'blur' }]
}

onMounted(async () => {
  await Promise.all([loadSalesmen(), loadConfigs()])

  if (isEdit.value) {
    await loadCustomer()
  }
})

async function loadSalesmen() {
  try {
    const res = await api.users.getSalesmen()
    salesmen.value = res.data
  } catch (error) {
    console.error('获取业务员列表失败:', error)
  }
}

async function loadConfigs() {
  try {
    const res = await api.configs.getAll()
    configs.value = res.data
  } catch (error) {
    console.error('获取配置失败:', error)
  }
}

// 自动计算每期还款额
watch(
  () => [form.collectionAmount, form.collectionPlan],
  ([amount, planName]) => {
    if (!amount || !planName || !configs.value.collectionPlans) {
      return
    }
    const plan = configs.value.collectionPlans.find(p =>
      typeof p === 'object' ? p.name === planName : false
    )
    if (plan) {
      const calc = amount * plan.rate + plan.fee
      form.trialCalculation = Math.round(calc * 100) / 100
      form.monthlyRepayment = form.trialCalculation
    }
  }
)

async function loadCustomer() {
  loading.value = true
  try {
    const res = await api.customers.getDetail(route.params.id)
    const data = res.data
    Object.assign(form, {
      ...data,
      salesmanId: data.salesmanId?._id || '',
      images: data.images || form.images
    })
  } catch (error) {
    console.error('获取客户详情失败:', error)
    ElMessage.error('获取客户详情失败')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
    await saveCustomer(false)
  } catch (error) {
    ElMessage.warning('请填写所有必填项')
  }
}

async function handleSaveDraft() {
  await saveCustomer(true)
}

async function saveCustomer(isDraft) {
  submitting.value = true
  try {
    const data = { ...form, isDraft }

    if (isEdit.value) {
      await api.customers.update(route.params.id, data)
      ElMessage.success('保存成功')
    } else {
      await api.customers.create(data)
      ElMessage.success('创建成功')
    }

    router.push('/customers')
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.el-form-item__content) {
  flex-wrap: nowrap;
}
</style>
