//! 项目存储

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::RwLock;

use crate::models::{Project, CreateProjectRequest};
use super::{get_data_dir, load_json, save_json};

/// 项目注册表
pub struct ProjectStore {
    path: PathBuf,
    projects: Arc<RwLock<HashMap<String, Project>>>,
}

impl ProjectStore {
    pub fn new() -> Self {
        let mut path = get_data_dir();
        path.push("projects.json");
        
        let projects: HashMap<String, Project> = load_json(&path);
        
        Self {
            path,
            projects: Arc::new(RwLock::new(projects)),
        }
    }

    /// 注册项目
    pub fn register(&self, req: CreateProjectRequest) -> Project {
        let project: Project = req.into();
        let project_id = project.project_id.clone();
        
        let mut projects = self.projects.write();
        projects.insert(project_id, project.clone());
        drop(projects);
        
        self.save();
        project
    }

    /// 获取项目
    #[allow(dead_code)]
    pub fn get(&self, project_id: &str) -> Option<Project> {
        self.projects.read().get(project_id).cloned()
    }

    /// 获取所有项目
    #[allow(dead_code)]
    pub fn get_all(&self) -> Vec<Project> {
        self.projects.read().values().cloned().collect()
    }

    /// 删除项目
    #[allow(dead_code)]
    pub fn delete(&self, project_id: &str) -> bool {
        let mut projects = self.projects.write();
        let removed = projects.remove(project_id).is_some();
        drop(projects);
        
        if removed {
            self.save();
        }
        removed
    }

    /// 保存到文件
    fn save(&self) {
        let projects = self.projects.read();
        let map: &HashMap<String, Project> = &projects;
        save_json(&self.path, map).ok();
    }
}

impl Default for ProjectStore {
    fn default() -> Self {
        Self::new()
    }
}
