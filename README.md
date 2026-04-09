# AI DevOps Platform v5.0.0

AI驱动的DevOps自动化平台，支持多项目管理、自动化部署、AI代码生成。

## 功能特性

- 🚀 **项目管理** - 注册和管理多个项目
- 🤖 **AI代码生成** - 集成AI进行代码生成
- 🔄 **CI/CD流水线** - 完整的构建、部署、验证流程
- 📊 **状态管理** - 实时任务状态追踪
- 💾 **记忆系统** - 项目上下文和历史记录
- 🔐 **安全确认** - 生产环境部署确认机制
- 📢 **通知系统** - 多渠道通知支持

## 项目结构

```
ai-devops/
├── nodejs/                 # Node.js 版本
│   ├── lib/               # 核心库
│   │   ├── project-registry.js
│   │   ├── task-system.js
│   │   ├── memory-system.js
│   │   ├── context-system.js
│   │   ├── state-system.js
│   │   ├── api-registry.js
│   │   ├── security.js
│   │   └── notification.js
│   ├── workers/           # Worker 进程
│   │   ├── ai-worker.js
│   │   ├── git-worker.js
│   │   ├── build-worker.js
│   │   └── deploy-worker.js
│   └── tests/             # 测试文件
│
├── rust/                   # Rust 版本
│   ├── src/
│   │   ├── main.rs
│   │   ├── models/        # 数据模型
│   │   └── storage/       # 存储层
│   └── Cargo.toml
│
└── data/                   # 数据文件
    ├── projects.json
    ├── tasks.json
    ├── memory.json
    ├── contexts.json
    ├── states.json
    └── api-registry.json
```

## 快速开始

### Node.js 版本

```bash
cd nodejs
npm install
npm start
```

### Rust 版本

```bash
cd rust
cargo build --release
cargo run --release
```

## API 示例

### 项目注册

```javascript
const { getAIDevOps } = require('./index');
const devops = getAIDevOps();

const project = devops.registerProject({
  name: 'my-project',
  path: '/path/to/project',
  repo: 'https://github.com/user/repo.git',
  servers: { dev: 'dev-server:22', prod: 'prod-server:22' },
  deploy_type: 'docker'
});
```

### 执行流水线

```javascript
const result = await devops.runFullPipeline('user-001', {
  prompt: '添加用户登录功能',
  project_id: 'proj_xxx',
  env: 'dev'
});
```

### 任务管理

```javascript
// 创建任务
const task = devops.createTask({
  project_id: 'proj_xxx',
  type: 'codegen',
  description: '生成API代码'
});

// 获取任务
const taskInfo = devops.getTask(task.task_id);
```

## 任务类型

| 类型 | 说明 |
|------|------|
| `full_pipeline` | 完整流水线（AI → Git → Build → Deploy → Verify） |
| `codegen` | 仅AI代码生成 |
| `build` | 仅构建 |
| `deploy` | 仅部署 |

## 部署环境

- `dev` - 开发环境
- `staging` - 预发布环境
- `prod` - 生产环境（需要确认）

## 安全机制

生产环境部署需要确认：

```javascript
// 请求确认
const confirmation = devops.security.requestConfirmation({
  user_id: 'user-001',
  action: 'deploy',
  project_id: 'proj_xxx',
  env: 'prod'
});

// 确认操作
devops.confirmOperation(confirmation.confirmation_id, true, 'user-001');
```

## 测试

```bash
# Node.js 测试
cd nodejs && npm test

# Rust 测试
cd rust && cargo test
```

## 技术栈

### Node.js 版本
- Express.js
- UUID
- Simple Git
- Node SSH
- Axios
- Kubernetes Client

### Rust 版本
- Tokio (异步运行时)
- Serde (序列化)
- Chrono (日期时间)
- UUID
- Reqwest (HTTP客户端)
- Tracing (日志)

## 版本历史

- **v5.0.0** - 初始版本，支持完整DevOps流水线

## 许可证

MIT License
