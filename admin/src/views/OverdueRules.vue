<template>
  <div class="overdue-rules">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>逾期规则配置</span>
          <el-button type="primary" @click="handleAdd">新增规则</el-button>
        </div>
      </template>

      <el-table :data="rules" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="规则名称" width="150" />
        <el-table-column label="判断条件" width="200">
          <template #default="{ row }">
            {{ getConditionText(row.condition) }}
          </template>
        </el-table-column>
        <el-table-column prop="daysThreshold" label="逾期天数" width="100" />
        <el-table-column label="启用提醒" width="100">
          <template #default="{ row }">
            <el-tag :type="row.reminderEnabled ? 'success' : 'info'">
              {{ row.reminderEnabled ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reminderTime" label="提醒时间" width="100" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button
              :type="row.isActive ? 'warning' : 'success'"
              link
              @click="handleToggle(row)"
            >
              {{ row.isActive ? '禁用' : '启用' }}
            </el-button>
            <el-popconfirm
              title="确定删除该规则吗？"
              @confirm="handleDelete(row._id)"
            >
              <template #reference>
                <el-button type="danger" link>删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingRule ? '编辑规则' : '新增规则'"
      width="600px"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="form.name" placeholder="如：入库超时" />
        </el-form-item>
        <el-form-item label="判断字段" prop="condition.field">
          <el-select v-model="form.condition.field" placeholder="请选择">
            <el-option label="创建时间" value="createdAt" />
            <el-option label="申请时间" value="applicationTime" />
            <el-option label="预计销售时间" value="expectedSaleTime" />
            <el-option label="是否收车" value="isCollected" />
            <el-option label="状态" value="status" />
          </el-select>
        </el-form-item>
        <el-form-item label="比较符" prop="condition.operator">
          <el-select v-model="form.condition.operator" placeholder="请选择">
            <el-option label="等于" value="eq" />
            <el-option label="不等于" value="ne" />
            <el-option label="大于" value="gt" />
            <el-option label="大于等于" value="gte" />
            <el-option label="小于" value="lt" />
            <el-option label="小于等于" value="lte" />
          </el-select>
        </el-form-item>
        <el-form-item label="比较值" prop="condition.value">
          <el-input v-model="form.condition.value" placeholder="如：未入库 或 pending" />
        </el-form-item>
        <el-form-item label="逾期天数" prop="daysThreshold">
          <el-input-number v-model="form.daysThreshold" :min="1" />
          <span style="margin-left: 10px">天</span>
        </el-form-item>
        <el-form-item label="启用提醒">
          <el-switch v-model="form.reminderEnabled" />
        </el-form-item>
        <el-form-item v-if="form.reminderEnabled" label="提醒时间">
          <el-time-picker v-model="form.reminderTime" format="HH:mm" value-format="HH:mm" />
        </el-form-item>
        <el-form-item v-if="form.reminderEnabled" label="提醒间隔">
          <el-input-number v-model="form.reminderInterval" :min="0" />
          <span style="margin-left: 10px; color: #909399">天 (0=只通知一次, ≥1=每隔N天再次通知)</span>
        </el-form-item>
        <el-form-item label="未分配处理">
          <el-select v-model="form.unassignedAction">
            <el-option label="不处理" value="none" />
            <el-option label="通知管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用规则">
          <el-switch v-model="form.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const loading = ref(false)
const rules = ref([])

const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref()
const editingRule = ref(null)

const form = reactive({
  name: '',
  condition: {
    field: '',
    operator: 'eq',
    value: ''
  },
  daysThreshold: 7,
  reminderEnabled: true,
  reminderTime: '09:00',
  reminderInterval: 0,
  unassignedAction: 'admin',
  isActive: true
})

const formRules = {
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  'condition.field': [{ required: true, message: '请选择判断字段', trigger: 'change' }],
  'condition.operator': [{ required: true, message: '请选择比较符', trigger: 'change' }],
  'condition.value': [{ required: true, message: '请输入比较值', trigger: 'blur' }],
  daysThreshold: [{ required: true, message: '请输入逾期天数', trigger: 'blur' }]
}

onMounted(() => {
  loadRules()
})

async function loadRules() {
  loading.value = true
  try {
    const res = await api.overdueRules.getList()
    rules.value = res.data
  } catch (error) {
    console.error('获取规则列表失败:', error)
  } finally {
    loading.value = false
  }
}

function handleAdd() {
  editingRule.value = null
  Object.assign(form, {
    name: '',
    condition: {
      field: '',
      operator: 'eq',
      value: ''
    },
    daysThreshold: 7,
    reminderEnabled: true,
    reminderTime: '09:00',
    reminderInterval: 0,
    unassignedAction: 'admin',
    isActive: true
  })
  dialogVisible.value = true
}

function handleEdit(rule) {
  editingRule.value = rule
  Object.assign(form, {
    name: rule.name,
    condition: { ...rule.condition },
    daysThreshold: rule.daysThreshold,
    reminderEnabled: rule.reminderEnabled,
    reminderTime: rule.reminderTime,
    reminderInterval: rule.reminderInterval || 0,
    unassignedAction: rule.unassignedAction,
    isActive: rule.isActive
  })
  dialogVisible.value = true
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
    submitting.value = true

    if (editingRule.value) {
      await api.overdueRules.update(editingRule.value._id, form)
      ElMessage.success('更新成功')
    } else {
      await api.overdueRules.create(form)
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    loadRules()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('提交失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

async function handleToggle(rule) {
  try {
    await api.overdueRules.update(rule._id, {
      isActive: !rule.isActive
    })
    ElMessage.success('操作成功')
    loadRules()
  } catch (error) {
    console.error('操作失败:', error)
  }
}

async function handleDelete(id) {
  try {
    await api.overdueRules.delete(id)
    ElMessage.success('删除成功')
    loadRules()
  } catch (error) {
    console.error('删除失败:', error)
  }
}

function getConditionText(condition) {
  const fieldMap = {
    createdAt: '创建时间',
    applicationTime: '申请时间',
    expectedSaleTime: '预计销售时间',
    isCollected: '是否收车',
    status: '状态'
  }
  const operatorMap = {
    eq: '等于',
    ne: '不等于',
    gt: '大于',
    gte: '大于等于',
    lt: '小于',
    lte: '小于等于'
  }
  return `${fieldMap[condition.field] || condition.field} ${operatorMap[condition.operator]} ${condition.value}`
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
