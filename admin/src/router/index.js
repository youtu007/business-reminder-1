import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '仪表盘' }
      },
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('../views/customers/List.vue'),
        meta: { title: '客户管理' }
      },
      {
        path: 'customers/create',
        name: 'CustomerCreate',
        component: () => import('../views/customers/Form.vue'),
        meta: { title: '新增客户' }
      },
      {
        path: 'customers/:id/edit',
        name: 'CustomerEdit',
        component: () => import('../views/customers/Form.vue'),
        meta: { title: '编辑客户' }
      },
      {
        path: 'customers/:id',
        name: 'CustomerDetail',
        component: () => import('../views/customers/Detail.vue'),
        meta: { title: '客户详情' }
      },
      {
        path: 'salesmen',
        name: 'Salesmen',
        component: () => import('../views/Salesmen.vue'),
        meta: { title: '业务员管理' }
      },
      {
        path: 'overdue-rules',
        name: 'OverdueRules',
        component: () => import('../views/OverdueRules.vue'),
        meta: { title: '逾期规则配置' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/Settings.vue'),
        meta: { title: '系统配置' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth !== false && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && userStore.isLoggedIn) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
