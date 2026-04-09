//! 上下文模型

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// 用户上下文
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserContext {
    /// 用户ID
    pub user_id: String,
    /// 当前项目ID
    pub current_project: Option<String>,
    /// 当前环境
    pub current_env: String,
    /// 最近使用的项目
    #[serde(default)]
    pub recent_projects: Vec<String>,
    /// 创建时间
    pub created_at: DateTime<Utc>,
    /// 更新时间
    pub updated_at: DateTime<Utc>,
}

impl UserContext {
    pub fn new(user_id: String) -> Self {
        let now = Utc::now();
        Self {
            user_id,
            current_project: None,
            current_env: "dev".to_string(),
            recent_projects: Vec::new(),
            created_at: now,
            updated_at: now,
        }
    }

    /// 切换项目
    pub fn switch_project(&mut self, project_id: String) {
        // 从最近列表中移除
        self.recent_projects.retain(|p| p != &project_id);
        // 添加到列表头部
        self.recent_projects.insert(0, project_id.clone());
        // 保留最近10个
        self.recent_projects.truncate(10);
        
        self.current_project = Some(project_id);
        self.updated_at = Utc::now();
    }

    /// 切换环境
    #[allow(dead_code)]
    pub fn switch_env(&mut self, env: String) {
        self.current_env = env;
        self.updated_at = Utc::now();
    }
}
