//! 状态模型

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// 阶段状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum PhaseStatus {
    /// 待执行
    Pending,
    /// 执行中
    Running,
    /// 成功
    Success,
    /// 失败
    Failed,
    /// 跳过
    Skipped,
}

impl Default for PhaseStatus {
    fn default() -> Self {
        Self::Pending
    }
}

/// 任务状态快照
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskState {
    /// 任务ID
    pub task_id: String,
    /// AI阶段状态
    pub ai: PhaseStatus,
    /// Git阶段状态
    pub git: PhaseStatus,
    /// 构建阶段状态
    pub build: PhaseStatus,
    /// 部署阶段状态
    pub deploy: PhaseStatus,
    /// 验证阶段状态
    pub verify: PhaseStatus,
    /// 综合状态
    pub overall: PhaseStatus,
    /// 创建时间
    pub created_at: DateTime<Utc>,
    /// 更新时间
    pub updated_at: DateTime<Utc>,
}

impl TaskState {
    pub fn new(task_id: String) -> Self {
        let now = Utc::now();
        Self {
            task_id,
            ai: PhaseStatus::default(),
            git: PhaseStatus::default(),
            build: PhaseStatus::default(),
            deploy: PhaseStatus::default(),
            verify: PhaseStatus::default(),
            overall: PhaseStatus::default(),
            created_at: now,
            updated_at: now,
        }
    }

    /// 更新阶段状态
    pub fn update_phase(&mut self, phase: &str, status: PhaseStatus) {
        match phase {
            "ai" => self.ai = status,
            "git" => self.git = status,
            "build" => self.build = status,
            "deploy" => self.deploy = status,
            "verify" => self.verify = status,
            _ => return,
        }
        self.updated_at = Utc::now();
        self.recalculate_overall();
    }

    /// 重新计算综合状态
    pub fn recalculate_overall(&mut self) {
        let phases = [&self.ai, &self.git, &self.build, &self.deploy, &self.verify];

        if phases.iter().any(|s| **s == PhaseStatus::Failed) {
            self.overall = PhaseStatus::Failed;
        } else if phases.iter().any(|s| **s == PhaseStatus::Running) {
            self.overall = PhaseStatus::Running;
        } else if phases.iter().all(|s| **s == PhaseStatus::Success || **s == PhaseStatus::Skipped) {
            self.overall = PhaseStatus::Success;
        } else {
            self.overall = PhaseStatus::Pending;
        }
    }
}
