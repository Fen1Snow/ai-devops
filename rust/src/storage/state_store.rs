//! 状态存储

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::RwLock;

use crate::models::{TaskState, PhaseStatus};
use super::{get_data_dir, load_json, save_json};

/// 状态存储
pub struct StateStore {
    path: PathBuf,
    states: Arc<RwLock<HashMap<String, TaskState>>>,
}

impl StateStore {
    pub fn new() -> Self {
        let mut path = get_data_dir();
        path.push("states.json");
        
        let states: HashMap<String, TaskState> = load_json(&path);
        
        Self {
            path,
            states: Arc::new(RwLock::new(states)),
        }
    }

    /// 初始化任务状态
    pub fn init(&self, task_id: &str) -> TaskState {
        let state = TaskState::new(task_id.to_string());
        
        let mut states = self.states.write();
        states.insert(task_id.to_string(), state.clone());
        drop(states);
        
        self.save();
        state
    }

    /// 获取状态
    #[allow(dead_code)]
    pub fn get(&self, task_id: &str) -> Option<TaskState> {
        self.states.read().get(task_id).cloned()
    }

    /// 更新阶段状态
    pub fn update_phase(&self, task_id: &str, phase: &str, status: PhaseStatus) -> Option<TaskState> {
        let mut states = self.states.write();
        if let Some(state) = states.get_mut(task_id) {
            state.update_phase(phase, status);
            let cloned = state.clone();
            drop(states);
            self.save();
            Some(cloned)
        } else {
            None
        }
    }

    fn save(&self) {
        let states = self.states.read();
        save_json(&self.path, &*states).ok();
    }
}

impl Default for StateStore {
    fn default() -> Self {
        Self::new()
    }
}
