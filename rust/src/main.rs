//! AI DevOps - AI驱动的DevOps自动化平台
//! 
//! 提供项目注册、任务执行、状态管理等功能

mod models;
mod storage;

use std::sync::Arc;
use models::*;
use storage::*;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 初始化日志
    tracing_subscriber::fmt::init();
    
    println!("🚀 AI DevOps Platform v0.1.0");
    println!("============================\n");
    
    // 初始化存储
    let project_store = Arc::new(ProjectStore::new());
    let task_store = Arc::new(TaskStore::new());
    let memory_store = Arc::new(MemoryStore::new());
    let state_store = Arc::new(StateStore::new());
    let context_store = Arc::new(ContextStore::new());
    let _api_store = Arc::new(ApiStore::new());
    
    // 示例：创建项目
    let project_req = CreateProjectRequest {
        name: "demo-project".to_string(),
        path: "/tmp/demo".to_string(),
        repo: Some("https://github.com/example/demo.git".to_string()),
        project_type: ProjectType::Nodejs,
        deploy_type: DeployType::Docker,
        servers: {
            let mut map = std::collections::HashMap::new();
            map.insert("dev".to_string(), "dev-server:22".to_string());
            map.insert("prod".to_string(), "prod-server:22".to_string());
            map
        },
    };
    
    let project = project_store.register(project_req);
    println!("✅ 已注册项目: {} ({})", project.name, project.project_id);
    
    // 示例：创建任务
    let task_req = CreateTaskRequest {
        project_id: project.project_id.clone(),
        task_type: TaskType::FullPipeline,
        env: Some("dev".to_string()),
        description: Some("完整流水线演示".to_string()),
        user_id: Some("user_001".to_string()),
    };
    
    let task = task_store.create(task_req);
    println!("✅ 已创建任务: {} ({})", task.task_id, task.task_type.to_string());
    
    // 初始化任务状态
    let state = state_store.init(&task.task_id);
    println!("📊 任务状态: {:?}", state.overall);
    
    // 模拟执行流水线
    run_pipeline(&task_store, &state_store, &memory_store, &task).await;
    
    // 示例：用户上下文
    let user_ctx = context_store.get_or_create("user_001");
    context_store.switch_project("user_001", &project.project_id);
    println!("\n👤 用户上下文: {} -> 项目: {:?}", user_ctx.user_id, context_store.get_or_create("user_001").current_project);
    
    println!("\n✨ 完成!");
    Ok(())
}

/// 执行流水线
async fn run_pipeline(
    task_store: &TaskStore,
    state_store: &StateStore,
    memory_store: &MemoryStore,
    task: &Task,
) {
    use PhaseStatus::*;
    
    // AI阶段
    state_store.update_phase(&task.task_id, "ai", Running);
    task_store.update_progress(&task.task_id, 10, "AI代码生成中");
    println!("\n🔄 AI阶段: 运行中...");
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    state_store.update_phase(&task.task_id, "ai", Success);
    task_store.update_progress(&task.task_id, 25, "AI代码生成完成");
    println!("✅ AI阶段: 完成");
    
    // Git阶段
    state_store.update_phase(&task.task_id, "git", Running);
    task_store.update_progress(&task.task_id, 30, "Git推送中");
    println!("🔄 Git阶段: 运行中...");
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    state_store.update_phase(&task.task_id, "git", Success);
    task_store.update_progress(&task.task_id, 50, "Git推送完成");
    println!("✅ Git阶段: 完成");
    
    // 构建阶段
    state_store.update_phase(&task.task_id, "build", Running);
    task_store.update_progress(&task.task_id, 55, "Docker构建中");
    println!("🔄 构建阶段: 运行中...");
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    state_store.update_phase(&task.task_id, "build", Success);
    task_store.update_progress(&task.task_id, 75, "Docker构建完成");
    println!("✅ 构建阶段: 完成");
    
    // 部署阶段
    state_store.update_phase(&task.task_id, "deploy", Running);
    task_store.update_progress(&task.task_id, 80, "部署到dev环境");
    println!("🔄 部署阶段: 运行中...");
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    state_store.update_phase(&task.task_id, "deploy", Success);
    task_store.update_progress(&task.task_id, 95, "部署完成");
    println!("✅ 部署阶段: 完成");
    
    // 验证阶段
    state_store.update_phase(&task.task_id, "verify", Running);
    task_store.update_progress(&task.task_id, 97, "验证部署结果");
    println!("🔄 验证阶段: 运行中...");
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    state_store.update_phase(&task.task_id, "verify", Success);
    task_store.update_progress(&task.task_id, 100, "验证完成");
    println!("✅ 验证阶段: 完成");
    
    // 添加记忆
    let memory = Memory::new(MemoryType::Deploy, format!("任务 {} 部署成功", task.task_id))
        .with_project(task.project_id.clone())
        .with_task(task.task_id.clone())
        .with_importance(0.8);
    memory_store.add(memory);
    
    // 标记任务完成
    task_store.update(&task.task_id, |t| {
        t.succeed(Some(serde_json::json!({
            "url": format!("https://dev.example.com/{}", t.project_id),
            "version": "1.0.0"
        })));
    });
    
    println!("\n🎉 流水线执行完成!");
}
