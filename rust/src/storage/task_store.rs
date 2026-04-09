//! 任务存储

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::RwLock;

use crate::models::{Task, CreateTaskRequest, TaskLog};
use super::{get_data_dir, load_json, save_json};

/// 任务存储
pub struct TaskStore {
    path: PathBuf,
    tasks: Arc<RwLock<HashMap<String, Task>>>,
}

impl TaskStore {
    pub fn new() -> Self {
        let mut path = get_data_dir();
        path.push("tasks.json");
        
        let tasks: HashMap<String, Task> = load_json(&path);
        
        Self {
            path,
            tasks: Arc::new(RwLock::new(tasks)),
        }
    }

    /// 创建任务
    pub fn create(&self, req: CreateTaskRequest) -> Task {
        let task: Task = req.into();
        let task_id = task.task_id.clone();
        
        let mut tasks = self.tasks.write();
        tasks.insert(task_id, task.clone());
        drop(tasks);
        
        self.save();
        task
    }

    /// 获取任务
    #[allow(dead_code)]
    pub fn get(&self, task_id: &str) -> Option<Task> {
        self.tasks.read().get(task_id).cloned()
    }

    /// 更新任务
    pub fn update(&self, task_id: &str, f: impl FnOnce(&mut Task)) -> Option<Task> {
        let mut tasks = self.tasks.write();
        if let Some(task) = tasks.get_mut(task_id) {
            f(task);
            let cloned = task.clone();
            drop(tasks);
            self.save();
            Some(cloned)
        } else {
            None
        }
    }

    /// 按项目获取任务
    #[allow(dead_code)]
    pub fn get_by_project(&self, project_id: &str) -> Vec<Task> {
        self.tasks.read()
            .values()
            .filter(|t| t.project_id == project_id)
            .cloned()
            .collect()
    }

    /// 添加日志
    #[allow(dead_code)]
    pub fn add_log(&self, task_id: &str, log: TaskLog) {
        self.update(task_id, |task| {
            task.add_log(log);
        });
    }

    /// 更新进度
    pub fn update_progress(&self, task_id: &str, progress: u8, step: &str) {
        self.update(task_id, |task| {
            task.update_progress(progress, step.to_string());
        });
    }

    fn save(&self) {
        let tasks = self.tasks.read();
        save_json(&self.path, &*tasks).ok();
    }
}

impl Default for TaskStore {
    fn default() -> Self {
        Self::new()
    }
}
