# 业务提醒系统

车辆业务管理系统，包含后端API、管理后台和微信小程序。

## 项目结构

```
业务提醒/
├── server/                 # Express后端
├── admin/                  # Vue3管理后台
└── miniprogram/           # 微信小程序
```

## 技术栈

- **后端**: Express + MongoDB + JWT
- **管理后台**: Vue3 + ElementPlus + Pinia + Vite
- **小程序**: 原生微信小程序

## 快速开始

### 1. 启动后端服务

```bash
# 进入后端目录
cd server

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置MongoDB连接等

# 启动开发服务器
npm run dev
```

后端默认运行在 http://localhost:3000

**默认管理员账号:**
- 用户名: admin
- 密码: admin123

### 2. 启动管理后台

```bash
# 进入管理后台目录
cd admin

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

管理后台默认运行在 http://localhost:8080

### 3. 运行微信小程序

1. 使用微信开发者工具打开 `miniprogram` 目录
2. 在 `project.config.json` 中配置你的 AppID
3. 在 `app.js` 中修改 `baseUrl` 为你的后端地址
4. 编译运行

## 环境变量配置 (server/.env)

```
# 服务器配置
PORT=3000
NODE_ENV=development

# MongoDB配置
MONGODB_URI=mongodb://localhost:27017/business_reminder

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# 微信小程序配置
WX_APPID=your_wx_appid
WX_SECRET=your_wx_secret

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

## API接口

### 认证
- `POST /api/auth/admin/login` - 管理员登录
- `POST /api/auth/wx/login` - 小程序登录
- `GET /api/auth/profile` - 获取用户信息

### 用户管理
- `GET /api/users` - 用户列表
- `GET /api/users/salesmen` - 业务员列表
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

### 客户管理
- `GET /api/customers` - 客户列表
- `GET /api/customers/:id` - 客户详情
- `POST /api/customers` - 创建客户
- `PUT /api/customers/:id` - 更新客户
- `DELETE /api/customers/:id` - 删除客户
- `POST /api/customers/:id/assign` - 分配业务员
- `GET /api/customers/:id/assignment-logs` - 分配记录
- `GET /api/customers/stats/overview` - 统计数据

### 文件上传
- `POST /api/upload` - 上传单个文件
- `POST /api/upload/multiple` - 上传多个文件

### 逾期规则
- `GET /api/overdue-rules` - 规则列表
- `POST /api/overdue-rules` - 创建规则
- `PUT /api/overdue-rules/:id` - 更新规则
- `DELETE /api/overdue-rules/:id` - 删除规则

### 系统配置
- `GET /api/configs` - 获取配置
- `PUT /api/configs/:key` - 更新配置

### 数据导出
- `GET /api/export/customers` - 导出客户数据

## 功能特性

### 管理后台
- 仪表盘：数据统计概览
- 客户管理：增删改查、分配业务员、导入导出
- 业务员管理：账号管理、启用禁用
- 逾期规则配置：自定义逾期规则
- 系统配置：开户行、客户来源、收车方案配置

### 小程序端
- 手机号登录
- 客户列表查看（按状态筛选）
- 客户详情查看
- 影像资料预览

## 数据模型

### Customer (客户)
- 基本信息：姓名、身份证、车牌号、车架号等
- 车辆信息：评估金额、收车金额、收车方案等
- 影像资料：多种类型照片
- 状态管理：未入库、已入库、逾期、已完成

### User (用户)
- 管理员：用户名密码登录
- 业务员：手机号登录

## 注意事项

1. 确保MongoDB服务已启动
2. 小程序需要在微信公众平台配置服务器域名
3. 生产环境需要配置HTTPS
4. 首次运行会自动创建默认管理员账号
