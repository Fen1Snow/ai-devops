# AI DevOps 平台

一个智能化的 DevOps 平台，支持 AI 驱动的代码生成、自动构建和部署。

## 架构

```
ai-devops/
├── index.js              # 主入口
├── lib/                  # 核心库
│   ├── project-registry.js   # 项目注册表
│   ├── context-system.js     # 用户上下文
│   ├── task-system.js        # 任务系统
│   ├── memory-system.js      # 记忆系统
│   ├── state-system.js       # 状态系统
│   ├── notification.js       # 通知系统
│   ├── security.js           # 安全机制
│   └── api-registry.js       # API注册
├── workers/              # 执行器
│   ├── ai-worker.js      # AI代码生成
│   ├── git-worker.js     # Git操作
│   ├── build-worker.js   # 构建任务
│   └── deploy-worker.js  # 部署任务
└── data/                 # 数据存储
```

## 安装

```bash
npm install
```

## 快速开始

```javascript
const { getAIDevOps } = require('./index');

const devops = getAIDevOps();

// 1. 注册项目
devops.registerProject({
  name: 'my-app',
  repo: 'https://github.com/user/my-app.git',
  path: '/path/to/project',
  servers: { dev: 'dev-server', prod: 'prod-server' },
  deploy_type: 'docker'
});

// 2. 切换项目上下文
devops.switchProject('user-001', 'proj_xxx');
devops.switchEnv('user-001', 'dev');

// 3. 执行完整流水线
const task = await devops.runFullPipeline('user-001', {
  prompt: '添加用户登录功能',
  env: 'dev'
});

// 4. 查看任务状态
console.log(devops.getTask(task.task_id));

// 5. 查看项目历史
console.log(devops.getProjectMemory('proj_xxx'));
```

## 主要功能

### 1. 项目管理
- 注册/更新/删除项目
- 支持多环境配置 (dev/prod)

### 2. 用户上下文
- 多用户支持
- 项目切换
- 环境切换

### 3. 任务系统
- 任务类型：codegen, build, deploy, full_pipeline
- 任务状态：pending, running, success, failed, cancelled
- 进度跟踪
- 日志记录

### 4. 记忆系统
- 存储AI历史操作
- 项目上下文记忆
- 操作历史查询

### 5. 状态同步
- AI/Git/Build/Deploy 各阶段状态
- 综合状态计算
- 状态变更事件

### 6. 通知系统
- 支持微信、飞书、Webhook
- 进度通知
- 构建/部署通知

### 7. 安全机制
- 生产环境操作确认
- 权限验证

## API 参考

### 项目管理
- `registerProject(project)` - 注册项目
- `getProject(project_id)` - 获取项目
- `getAllProjects()` - 获取所有项目

### 上下文管理
- `switchProject(user_id, project_id)` - 切换项目
- `switchEnv(user_id, env)` - 切换环境

### 任务执行
- `runFullPipeline(user_id, params)` - 完整流水线
- `runCodegen(user_id, params)` - 仅代码生成
- `runBuild(user_id, params)` - 仅构建
- `runDeploy(user_id, params)` - 仅部署

### 查询
- `getTask(task_id)` - 获取任务
- `getTaskHistory(project_id)` - 任务历史
- `getProjectMemory(project_id)` - 项目记忆

## 配置通知渠道

```javascript
// 企业微信
devops.registerNotificationChannel('wechat', {
  webhook_url: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx'
});

// 飞书
devops.registerNotificationChannel('feishu', {
  webhook_url: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx'
});
```

## 许可证

MIT
