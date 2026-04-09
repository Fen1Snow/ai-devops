//! 上下文存储

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::RwLock;

use crate::models::UserContext;
use super::{get_data_dir, load_json, save_json};

/// 上下文存储
pub struct ContextStore {
    path: PathBuf,
    contexts: Arc<RwLock<HashMap<String, UserContext>>>,
}

impl ContextStore {
    pub fn new() -> Self {
        let mut path = get_data_dir();
        path.push("contexts.json");
        
        let contexts: HashMap<String, UserContext> = load_json(&path);
        
        Self {
            path,
            contexts: Arc::new(RwLock::new(contexts)),
        }
    }

    /// 获取或创建用户上下文
    pub fn get_or_create(&self, user_id: &str) -> UserContext {
        let mut contexts = self.contexts.write();
        if let Some(ctx) = contexts.get(user_id) {
            ctx.clone()
        } else {
            let ctx = UserContext::new(user_id.to_string());
            contexts.insert(user_id.to_string(), ctx.clone());
            drop(contexts);
            self.save();
            ctx
        }
    }

    /// 切换项目
    pub fn switch_project(&self, user_id: &str, project_id: &str) -> UserContext {
        let mut contexts = self.contexts.write();
        let ctx = contexts.entry(user_id.to_string())
            .or_insert_with(|| UserContext::new(user_id.to_string()));
        ctx.switch_project(project_id.to_string());
        let cloned = ctx.clone();
        drop(contexts);
        self.save();
        cloned
    }

    /// 切换环境
    #[allow(dead_code)]
    pub fn switch_env(&self, user_id: &str, env: &str) -> UserContext {
        let mut contexts = self.contexts.write();
        let ctx = contexts.entry(user_id.to_string())
            .or_insert_with(|| UserContext::new(user_id.to_string()));
        ctx.switch_env(env.to_string());
        let cloned = ctx.clone();
        drop(contexts);
        self.save();
        cloned
    }

    fn save(&self) {
        let contexts = self.contexts.read();
        save_json(&self.path, &*contexts).ok();
    }
}

impl Default for ContextStore {
    fn default() -> Self {
        Self::new()
    }
}
