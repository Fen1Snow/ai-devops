//! API存储

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::RwLock;

use crate::models::Api;
use super::{get_data_dir, load_json, save_json};

/// API存储
#[allow(dead_code)]
pub struct ApiStore {
    path: PathBuf,
    apis: Arc<RwLock<HashMap<String, Api>>>,
}

impl ApiStore {
    pub fn new() -> Self {
        let mut path = get_data_dir();
        path.push("apis.json");
        
        let apis: HashMap<String, Api> = load_json(&path);
        
        Self {
            path,
            apis: Arc::new(RwLock::new(apis)),
        }
    }

    /// 注册API
    #[allow(dead_code)]
    pub fn register(&self, api: Api) -> Api {
        let api_id = api.api_id.clone();
        
        let mut apis = self.apis.write();
        apis.insert(api_id, api.clone());
        drop(apis);
        
        self.save();
        api
    }

    /// 获取API
    #[allow(dead_code)]
    pub fn get(&self, api_id: &str) -> Option<Api> {
        self.apis.read().get(api_id).cloned()
    }

    /// 按服务名获取
    #[allow(dead_code)]
    pub fn get_by_service(&self, service_name: &str) -> Option<Api> {
        self.apis.read()
            .values()
            .find(|a| a.service_name == service_name)
            .cloned()
    }

    /// 获取所有API
    #[allow(dead_code)]
    pub fn get_all(&self) -> Vec<Api> {
        self.apis.read().values().cloned().collect()
    }

    #[allow(dead_code)]
    fn save(&self) {
        let apis = self.apis.read();
        save_json(&self.path, &*apis).ok();
    }
}

impl Default for ApiStore {
    fn default() -> Self {
        Self::new()
    }
}
