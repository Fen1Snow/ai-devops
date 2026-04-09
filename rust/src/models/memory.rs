//! 记忆模型

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// 记忆类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MemoryType {
    /// 代码生成
    Codegen,
    /// 构建
    Build,
    /// 部署
    Deploy,
    /// 对话
    Conversation,
    /// 上下文
    Context,
}

/// 记忆条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Memory {
    /// 记忆ID
    pub memory_id: String,
    /// 项目ID
    pub project_id: Option<String>,
    /// 任务ID
    pub task_id: Option<String>,
    /// 用户ID
    pub user_id: Option<String>,
    /// 类型
    pub memory_type: MemoryType,
    /// 内容
    pub content: String,
    /// 重要性 (0-1)
    pub importance: f32,
    /// 元数据
    #[serde(default)]
    pub metadata: serde_json::Value,
    /// 创建时间
    pub created_at: DateTime<Utc>,
    /// 过期时间
    pub expires_at: Option<DateTime<Utc>>,
}

impl Memory {
    pub fn new(memory_type: MemoryType, content: String) -> Self {
        Self {
            memory_id: format!("mem_{}", Uuid::new_v4()),
            project_id: None,
            task_id: None,
            user_id: None,
            memory_type,
            content,
            importance: 0.5,
            metadata: serde_json::Value::Null,
            created_at: Utc::now(),
            expires_at: None,
        }
    }

    pub fn with_project(mut self, project_id: String) -> Self {
        self.project_id = Some(project_id);
        self
    }

    pub fn with_task(mut self, task_id: String) -> Self {
        self.task_id = Some(task_id);
        self
    }

    pub fn with_importance(mut self, importance: f32) -> Self {
        self.importance = importance.clamp(0.0, 1.0);
        self
    }
}
