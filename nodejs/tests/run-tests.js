/**
 * AI DevOps 测试脚本
 */

const { getAIDevOps, TASK_TYPES, TASK_STATUS, STATE_STATUS } = require('../index');

console.log('=== AI DevOps 全面测试 ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('✅ ' + name);
    passed++;
  } catch (error) {
    console.log('❌ ' + name + ': ' + error.message);
    failed++;
  }
}

// 获取实例
const devops = getAIDevOps();

// 1. 项目注册测试
test('项目注册', () => {
  const project = devops.registerProject({
    name: 'test-app-' + Date.now(), // 使用时间戳避免重复
    path: '/tmp/test-app-' + Date.now(),
    repo: 'https://github.com/test/test.git',
    servers: { dev: 'dev-server:22' },
    deploy_type: 'docker'
  });
  if (!project.project_id) throw new Error('项目ID未生成');
});

// 2. 项目获取测试
test('项目获取', () => {
  const projects = devops.getAllProjects();
  if (!Array.isArray(projects)) throw new Error('返回格式错误');
  if (projects.length === 0) throw new Error('项目列表为空');
});

// 3. 上下文测试
test('上下文切换', () => {
  const projects = devops.getAllProjects();
  devops.switchProject('test-user', projects[0].project_id);
  devops.switchEnv('test-user', 'dev');
  // 无错误即成功
});

// 4. 任务创建测试
test('任务创建', () => {
  const projects = devops.getAllProjects();
  const task = devops.createTask({
    project_id: projects[0].project_id,
    type: TASK_TYPES.CODEGEN,
    description: '测试任务'
  });
  if (!task.task_id) throw new Error('任务ID未生成');
});

// 5. 记忆系统测试
test('记忆系统', () => {
  const projects = devops.getAllProjects();
  const result = devops.memorySystem.addMemory({
    project_id: projects[0].project_id,
    type: 'test',
    content: '测试记忆'
  });
  if (!result.memory_id) throw new Error('记忆添加失败');
});

// 6. 状态系统测试
test('状态系统', () => {
  const taskId = 'test-task-' + Date.now();
  devops.stateSystem.initTaskState(taskId);
  devops.stateSystem.updateStatus(taskId, 'ai', STATE_STATUS.RUNNING);
  const state = devops.stateSystem.getState(taskId);
  if (state.ai_status !== STATE_STATUS.RUNNING) throw new Error('状态更新失败');
});

// 7. 安全系统测试
test('安全系统', () => {
  const projects = devops.getAllProjects();
  const confirmation = devops.security.requestConfirmation({
    user_id: 'test-user',
    action: 'deploy',
    project_id: projects[0].project_id,
    env: 'prod'
  });
  if (!confirmation.required) throw new Error('生产环境应该需要确认');
});

// 8. API注册测试
test('API注册', () => {
  const api = devops.apiRegistry.registerApi({
    service_name: 'test-service-' + Date.now(),
    openapi_spec: { openapi: '3.0.0', paths: {} }
  });
  if (!api.api_id) throw new Error('API ID未生成');
});

// 9. 通知系统测试
test('通知系统', () => {
  devops.registerNotificationChannel('console', {});
  // 无错误即成功
});

// 输出结果
console.log('\n=== 测试结果 ===');
console.log('通过: ' + passed);
console.log('失败: ' + failed);

if (failed > 0) {
  process.exit(1);
}
