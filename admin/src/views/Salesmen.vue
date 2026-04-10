<template>
  <div class="salesmen">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>业务员管理</span>
          <el-button type="primary" @click="handleAdd">新增业务员</el-button>
        </div>
      </template>

      <el-table :data="users" v-loading="loading" style="width: 100%">
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="phone" label="手机号" width="150" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : ''">
              {{ row.role === 'admin' ? '管理员' : '业务员' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button
              :type="row.status === 'active' ? 'warning' : 'success'"
              link
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-popconfirm
              title="确定删除该用户吗？"
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
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @size-change="loadUsers"
        @current-change="loadUsers"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingUser ? '编辑用户' : '新增业务员'"
      width="500px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item v-if="!editingUser" label="角色" prop="role">
          <el-select v-model="form.role">
            <el-option label="业务员" value="salesman" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <template v-if="form.role === 'admin' && !editingUser">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" show-password />
          </el-form-item>
        </template>
        <el-form-item v-if="editingUser" label="新密码">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="不修改请留空"
          />
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
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'
import dayjs from 'dayjs'

const loading = ref(false)
const users = ref([])
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref()
const editingUser = ref(null)

const form = reactive({
  name: '',
  phone: '',
  role: 'admin',
  username: '',
  password: ''
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

onMounted(() => {
  loadUsers()
})

async function loadUsers() {
  loading.value = true
  try {
    const res = await api.users.getList({
      page: pagination.page,
      limit: pagination.limit
    })
    users.value = res.data
    pagination.total = res.pagination.total
  } catch (error) {
    console.error('获取用户列表失败:', error)
  } finally {
    loading.value = false
  }
}

function handleAdd() {
  editingUser.value = null
  Object.assign(form, {
    name: '',
    phone: '',
    role: 'admin',
    username: '',
    password: ''
  })
  dialogVisible.value = true
}

function handleEdit(user) {
  editingUser.value = user
  Object.assign(form, {
    name: user.name,
    phone: user.phone,
    role: user.role,
    username: user.username || '',
    password: ''
  })
  dialogVisible.value = true
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
    submitting.value = true

    const data = { ...form }
    if (!data.password) delete data.password

    if (editingUser.value) {
      await api.users.update(editingUser.value._id, data)
      ElMessage.success('更新成功')
    } else {
      await api.users.create(data)
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('提交失败:', error)
    }
  } finally {
    submitting.value = false
  }
}

async function handleToggleStatus(user) {
  try {
    await api.users.update(user._id, {
      status: user.status === 'active' ? 'inactive' : 'active'
    })
    ElMessage.success('操作成功')
    loadUsers()
  } catch (error) {
    console.error('操作失败:', error)
  }
}

async function handleDelete(id) {
  try {
    await api.users.delete(id)
    ElMessage.success('删除成功')
    loadUsers()
  } catch (error) {
    console.error('删除失败:', error)
  }
}

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
