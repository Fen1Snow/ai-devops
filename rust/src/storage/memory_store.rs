//! 记忆存储

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::RwLock;

use crate::models::Memory;
use super::{get_data_dir, load_json, save_json};

/// 记忆存储
pub struct MemoryStore {
    path: PathBuf,
    memories: Arc<RwLock<HashMap<String, Memory>>>,
}

impl MemoryStore {
    pub fn new() -> Self {
        let mut path = get_data_dir();
        path.push("memory.json");
        
        let memories: HashMap<String, Memory> = load_json(&path);
        
        Self {
            path,
            memories: Arc::new(RwLock::new(memories)),
        }
    }

    /// 添加记忆
    pub fn add(&self, memory: Memory) -> Memory {
        let memory_id = memory.memory_id.clone();
        
        let mut memories = self.memories.write();
        memories.insert(memory_id, memory.clone());
        drop(memories);
        
        self.save();
        memory
    }

    /// 获取项目的最近记忆
    #[allow(dead_code)]
    pub fn get_recent(&self, project_id: &str, limit: usize) -> Vec<Memory> {
        let memories = self.memories.read();
        let mut project_memories: Vec<_> = memories
            .values()
            .filter(|m| m.project_id.as_deref() == Some(project_id))
            .cloned()
            .collect();
        
        project_memories.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        project_memories.truncate(limit);
        project_memories
    }

    /// 按类型获取记忆
    #[allow(dead_code)]
    pub fn get_by_type(&self, memory_type: &str) -> Vec<Memory> {
        self.memories.read()
            .values()
            .filter(|m| format!("{:?}", m.memory_type).to_lowercase() == memory_type.to_lowercase())
            .cloned()
            .collect()
    }

    fn save(&self) {
        let memories = self.memories.read();
        save_json(&self.path, &*memories).ok();
    }
}

impl Default for MemoryStore {
    fn default() -> Self {
        Self::new()
    }
}
