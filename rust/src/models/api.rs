//! API模型

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// API注册信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Api {
    /// API ID
    pub api_id: String,
    /// 服务名称
    pub service_name: String,
    /// 版本
    pub version: String,
    /// 项目ID
    pub project_id: Option<String>,
    /// OpenAPI规范
    pub openapi_spec: serde_json::Value,
    /// 创建时间
    pub created_at: DateTime<Utc>,
    /// 更新时间
    pub updated_at: DateTime<Utc>,
}

impl Api {
    #[allow(dead_code)]
    pub fn new(service_name: String, openapi_spec: serde_json::Value) -> Self {
        let now = Utc::now();
        Self {
            api_id: format!("api_{}", Uuid::new_v4()),
            service_name,
            version: "1.0.0".to_string(),
            project_id: None,
            openapi_spec,
            created_at: now,
            updated_at: now,
        }
    }

    /// 提取端点列表
    #[allow(dead_code)]
    pub fn extract_endpoints(&self) -> Vec<Endpoint> {
        let mut endpoints = Vec::new();

        if let Some(paths) = self.openapi_spec.get("paths").and_then(|p| p.as_object()) {
            for (path, methods) in paths {
                if let Some(methods) = methods.as_object() {
                    for (method, operation) in methods {
                        let endpoint = Endpoint {
                            path: path.clone(),
                            method: method.to_uppercase(),
                            operation_id: operation.get("operationId")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string()),
                            summary: operation.get("summary")
                                .and_then(|v| v.as_str())
                                .unwrap_or("")
                                .to_string(),
                        };
                        endpoints.push(endpoint);
                    }
                }
            }
        }

        endpoints
    }
}

/// API端点
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct Endpoint {
    pub path: String,
    pub method: String,
    pub operation_id: Option<String>,
    pub summary: String,
}
