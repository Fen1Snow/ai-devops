//! 任务模型

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use std::fmt;

/// 任务类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum TaskType {
    /// AI代码生成
    Codegen,
    /// 构建
    Build,
    /// 部署
    Deploy,
    /// 完整流水线
    FullPipeline,
}

impl Default for TaskType {
    fn default() -> Self {
        Self::FullPipeline
    }
}

impl fmt::Display for TaskType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TaskType::Codegen => write!(f, "codegen"),
            TaskType::Build => write!(f, "build"),
            TaskType::Deploy => write!(f, "deploy"),
            TaskType::FullPipeline => write!(f, "full_pipeline"),
        }
    }
}

/// 任务状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    /// 待执行
    Pending,
    /// 执行中
    Running,
    /// 成功
    Success,
    /// 失败
    Failed,
    /// 已取消
    Cancelled,
}

impl Default for TaskStatus {
    fn default() -> Self {
        Self::Pending
    }
}

/// 任务日志级别
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Info,
    Warn,
    Error,
    Debug,
}

/// 任务日志条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskLog {
    /// 时间戳
    pub timestamp: DateTime<Utc>,
    /// 日志级别
    pub level: LogLevel,
    /// 消息
    pub message: String,
}

impl TaskLog {
    #[allow(dead_code)]
    pub fn new(level: LogLevel, message: String) -> Self {
        Self {
            timestamp: Utc::now(),
            level,
            message,
        }
    }

    #[allow(dead_code)]
    pub fn info(message: String) -> Self {
        Self::new(LogLevel::Info, message)
    }

    #[allow(dead_code)]
    pub fn warn(message: String) -> Self {
        Self::new(LogLevel::Warn, message)
    }

    #[allow(dead_code)]
    pub fn error(message: String) -> Self {
        Self::new(LogLevel::Error, message)
    }
}

/// 任务
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    /// 任务ID
    pub task_id: String,
    /// 项目ID
    pub project_id: String,
    /// 任务类型
    pub task_type: TaskType,
    /// 任务状态
    pub status: TaskStatus,
    /// 环境标识
    pub env: Option<String>,
    /// 描述
    pub description: Option<String>,
    /// 用户ID
    pub user_id: Option<String>,
    /// 进度 (0-100)
    pub progress: u8,
    /// 当前步骤
    pub current_step: Option<String>,
    /// 错误信息
    pub error: Option<String>,
    /// 日志
    #[serde(default)]
    pub logs: Vec<TaskLog>,
    /// 创建时间
    pub created_at: DateTime<Utc>,
    /// 更新时间
    pub updated_at: DateTime<Utc>,
    /// 开始时间
    pub started_at: Option<DateTime<Utc>>,
    /// 完成时间
    pub finished_at: Option<DateTime<Utc>>,
    /// 结果数据
    pub result: Option<serde_json::Value>,
}

impl Task {
    /// 创建新任务
    pub fn new(project_id: String, task_type: TaskType) -> Self {
        let now = Utc::now();
        Self {
            task_id: format!("task_{}", Uuid::new_v4()),
            project_id,
            task_type,
            status: TaskStatus::default(),
            env: None,
            description: None,
            user_id: None,
            progress: 0,
            current_step: None,
            error: None,
            logs: Vec::new(),
            created_at: now,
            updated_at: now,
            started_at: None,
            finished_at: None,
            result: None,
        }
    }

    /// 设置描述
    #[allow(dead_code)]
    pub fn with_description(mut self, description: String) -> Self {
        self.description = Some(description);
        self
    }

    /// 设置环境
    #[allow(dead_code)]
    pub fn with_env(mut self, env: String) -> Self {
        self.env = Some(env);
        self
    }

    /// 设置用户ID
    #[allow(dead_code)]
    pub fn with_user(mut self, user_id: String) -> Self {
        self.user_id = Some(user_id);
        self
    }

    /// 添加日志
    #[allow(dead_code)]
    pub fn add_log(&mut self, log: TaskLog) {
        self.logs.push(log);
        self.updated_at = Utc::now();
    }

    /// 更新进度
    pub fn update_progress(&mut self, progress: u8, step: String) {
        self.progress = progress.min(100);
        self.current_step = Some(step);
        self.updated_at = Utc::now();
    }

    /// 标记为运行中
    #[allow(dead_code)]
    pub fn start(&mut self) {
        self.status = TaskStatus::Running;
        self.started_at = Some(Utc::now());
        self.updated_at = Utc::now();
    }

    /// 标记为成功
    pub fn succeed(&mut self, result: Option<serde_json::Value>) {
        self.status = TaskStatus::Success;
        self.progress = 100;
        self.result = result;
        self.finished_at = Some(Utc::now());
        self.updated_at = Utc::now();
    }

    /// 标记为失败
    #[allow(dead_code)]
    pub fn fail(&mut self, error: String) {
        self.status = TaskStatus::Failed;
        self.error = Some(error);
        self.finished_at = Some(Utc::now());
        self.updated_at = Utc::now();
    }
}

/// 创建任务的请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTaskRequest {
    pub project_id: String,
    #[serde(default)]
    pub task_type: TaskType,
    #[serde(default)]
    pub env: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub user_id: Option<String>,
}

impl From<CreateTaskRequest> for Task {
    fn from(req: CreateTaskRequest) -> Self {
        let mut task = Task::new(req.project_id, req.task_type);
        task.env = req.env;
        task.description = req.description;
        task.user_id = req.user_id;
        task
    }
}
