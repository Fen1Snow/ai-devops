//! 项目模型

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// 项目信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    /// 项目ID
    pub project_id: String,
    /// 项目名称
    pub name: String,
    /// Git仓库地址
    pub repo: Option<String>,
    /// 本地路径
    pub path: String,
    /// 项目类型
    pub project_type: ProjectType,
    /// 部署类型
    pub deploy_type: DeployType,
    /// 服务器配置 (env -> server)
    pub servers: std::collections::HashMap<String, String>,
    /// 创建时间
    pub created_at: DateTime<Utc>,
    /// 更新时间
    pub updated_at: DateTime<Utc>,
    /// 元数据
    #[serde(default)]
    pub metadata: std::collections::HashMap<String, serde_json::Value>,
}

/// 项目类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProjectType {
    Nodejs,
    Rust,
    Python,
    Go,
    Java,
    Docker,
}

impl Default for ProjectType {
    fn default() -> Self {
        Self::Nodejs
    }
}

/// 部署类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DeployType {
    Docker,
    Kubernetes,
    Ssh,
    Serverless,
}

impl Default for DeployType {
    fn default() -> Self {
        Self::Docker
    }
}

impl Project {
    /// 创建新项目
    #[allow(dead_code)]
    pub fn new(name: String, path: String) -> Self {
        let now = Utc::now();
        Self {
            project_id: format!("proj_{}", Uuid::new_v4()),
            name,
            repo: None,
            path,
            project_type: ProjectType::default(),
            deploy_type: DeployType::default(),
            servers: std::collections::HashMap::new(),
            created_at: now,
            updated_at: now,
            metadata: std::collections::HashMap::new(),
        }
    }

    /// 设置仓库地址
    #[allow(dead_code)]
    pub fn with_repo(mut self, repo: String) -> Self {
        self.repo = Some(repo);
        self
    }

    /// 设置项目类型
    #[allow(dead_code)]
    pub fn with_project_type(mut self, project_type: ProjectType) -> Self {
        self.project_type = project_type;
        self
    }

    /// 设置部署类型
    #[allow(dead_code)]
    pub fn with_deploy_type(mut self, deploy_type: DeployType) -> Self {
        self.deploy_type = deploy_type;
        self
    }

    /// 添加服务器
    #[allow(dead_code)]
    pub fn add_server(&mut self, env: String, server: String) {
        self.servers.insert(env, server);
        self.updated_at = Utc::now();
    }
}

/// 创建项目的请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub path: String,
    #[serde(default)]
    pub repo: Option<String>,
    #[serde(default)]
    pub project_type: ProjectType,
    #[serde(default)]
    pub deploy_type: DeployType,
    #[serde(default)]
    pub servers: std::collections::HashMap<String, String>,
}

impl From<CreateProjectRequest> for Project {
    fn from(req: CreateProjectRequest) -> Self {
        let mut project = Project::new(req.name, req.path);
        project.repo = req.repo;
        project.project_type = req.project_type;
        project.deploy_type = req.deploy_type;
        project.servers = req.servers;
        project
    }
}
