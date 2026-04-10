<template>
  <div class="settings">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>开户行配置</span>
          </template>
          <el-tag
            v-for="(bank, index) in configs.banks"
            :key="index"
            closable
            style="margin: 4px"
            @close="handleRemoveItem('banks', index)"
          >
            {{ bank }}
          </el-tag>
          <el-input
            v-if="showBankInput"
            ref="bankInputRef"
            v-model="newBank"
            size="small"
            style="width: 120px; margin: 4px"
            @keyup.enter="handleAddBank"
            @blur="handleAddBank"
          />
          <el-button
            v-else
            size="small"
            style="margin: 4px"
            @click="showBankInput = true"
          >
            + 添加
          </el-button>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card>
          <template #header>
            <span>客户来源配置</span>
          </template>
          <el-tag
            v-for="(source, index) in configs.customerSources"
            :key="index"
            closable
            style="margin: 4px"
            @close="handleRemoveItem('customerSources', index)"
          >
            {{ source }}
          </el-tag>
          <el-input
            v-if="showSourceInput"
            ref="sourceInputRef"
            v-model="newSource"
            size="small"
            style="width: 120px; margin: 4px"
            @keyup.enter="handleAddSource"
            @blur="handleAddSource"
          />
          <el-button
            v-else
            size="small"
            style="margin: 4px"
            @click="showSourceInput = true"
          >
            + 添加
          </el-button>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card>
          <template #header>
            <span>收车方案配置</span>
          </template>
          <el-tag
            v-for="(plan, index) in configs.collectionPlans"
            :key="index"
            closable
            style="margin: 4px"
            @close="handleRemoveItem('collectionPlans', index)"
          >
            {{ plan }}
          </el-tag>
          <el-input
            v-if="showPlanInput"
            ref="planInputRef"
            v-model="newPlan"
            size="small"
            style="width: 120px; margin: 4px"
            @keyup.enter="handleAddPlan"
            @blur="handleAddPlan"
          />
          <el-button
            v-else
            size="small"
            style="margin: 4px"
            @click="showPlanInput = true"
          >
            + 添加
          </el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const configs = reactive({
  banks: [],
  customerSources: [],
  collectionPlans: []
})

const showBankInput = ref(false)
const showSourceInput = ref(false)
const showPlanInput = ref(false)

const newBank = ref('')
const newSource = ref('')
const newPlan = ref('')

const bankInputRef = ref()
const sourceInputRef = ref()
const planInputRef = ref()

onMounted(async () => {
  await loadConfigs()
})

async function loadConfigs() {
  try {
    const res = await api.configs.getAll()
    Object.assign(configs, res.data)
  } catch (error) {
    console.error('获取配置失败:', error)
  }
}

async function saveConfig(key, value) {
  try {
    await api.configs.update(key, value)
    ElMessage.success('保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  }
}

async function handleAddBank() {
  if (newBank.value.trim()) {
    configs.banks.push(newBank.value.trim())
    await saveConfig('banks', configs.banks)
  }
  newBank.value = ''
  showBankInput.value = false
}

async function handleAddSource() {
  if (newSource.value.trim()) {
    configs.customerSources.push(newSource.value.trim())
    await saveConfig('customerSources', configs.customerSources)
  }
  newSource.value = ''
  showSourceInput.value = false
}

async function handleAddPlan() {
  if (newPlan.value.trim()) {
    configs.collectionPlans.push(newPlan.value.trim())
    await saveConfig('collectionPlans', configs.collectionPlans)
  }
  newPlan.value = ''
  showPlanInput.value = false
}

async function handleRemoveItem(key, index) {
  configs[key].splice(index, 1)
  await saveConfig(key, configs[key])
}
</script>

<style scoped>
</style>
