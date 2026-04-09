//! 存储层

mod project_store;
mod task_store;
mod memory_store;
mod state_store;
mod context_store;
mod api_store;

pub use project_store::*;
pub use task_store::*;
pub use memory_store::*;
pub use state_store::*;
pub use context_store::*;
pub use api_store::*;

use std::path::PathBuf;
use std::fs;

/// 获取数据目录
pub fn get_data_dir() -> PathBuf {
    let mut path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    path.push("data");
    
    if !path.exists() {
        fs::create_dir_all(&path).ok();
    }
    
    path
}

/// 加载JSON文件
pub fn load_json<T: for<'de> serde::Deserialize<'de>>(path: &PathBuf) -> T 
where T: Default {
    match fs::read_to_string(path) {
        Ok(content) => {
            serde_json::from_str(&content).unwrap_or_default()
        }
        Err(_) => T::default()
    }
}

/// 保存JSON文件
pub fn save_json<T: serde::Serialize>(path: &PathBuf, data: &T) -> anyhow::Result<()> {
    let content = serde_json::to_string_pretty(data)?;
    fs::write(path, content)?;
    Ok(())
}
