/**
 * AI DevOps 平台主入口
 * 整合所有模块，提供统一的API
 */

// 核心库
const { getProjectRegistry, ProjectRegistry } = require('./lib/project-registry');
const { getContextSystem, ContextSystem } = require('./lib/context-system');
const { getTaskSystem, TaskSystem, TASK_TYPES, TASK_STATUS } = require('./lib/task-system');
const { getMemorySystem, MemorySystem } = require('./lib/memory-system');
const { getStateSystem, StateSystem, STATE_STATUS } = require('./lib/state-system');
const { getNotificationSystem, NotificationSystem } = require('./lib/notification');
const { getSecurity } = require('./lib/security');
const { getApiRegistry, ApiRegistry } = require('./lib/api-registry');

// Workers
const { getAIWorker } = require('./workers/ai-worker');
const { getGitWorker } = require('./workers/git-worker');
const { getBuildWorker } = require('./workers/build-worker');
const { getDeployWorker } = require('./workers/deploy-worker');

/**
 * AI DevOps 平台
 */
class AIDevOps {
  constructor() {
    this.projectRegistry = getProjectRegistry();
    this.contextSystem = getContextSystem();
    this.taskSystem = getTaskSystem();
    this.memorySystem = getMemorySystem();
    this.stateSystem = getStateSystem();
    this.notificationSystem = getNotificationSystem();
    this.security = getSecurity();
    this.apiRegistry = getApiRegistry();

    // Workers
    this.aiWorker = getAIWorker();
    this.gitWorker = getGitWorker();
    this.buildWorker = getBuildWorker();
    this.deployWorker = getDeployWorker();
  }

  /**
   * 注册项目
   */
  registerProject(project) {
    return this.projectRegistry.register(project);
  }

  /**
   * 获取项目
   */
  getProject(project_id) {
    return this.projectRegistry.get(project_id);
  }

  /**
   * 获取所有项目
   */
  getAllProjects() {
    return this.projectRegistry.getAll();
  }

  /**
   * 切换项目上下文
   */
  switchProject(user_id, project_id) {
    return this.contextSystem.switchProject(user_id, project_id);
  }

  /**
   * 切换环境
   */
  switchEnv(user_id, env) {
    return this.contextSystem.switchEnv(user_id, env);
  }

  /**
   * 创建任务
   */
  createTask(params) {
    return this.taskSystem.create(params);
  }

  /**
   * 获取任务
   */
  getTask(task_id) {
    return this.taskSystem.get(task_id);
  }

  /**
   * 执行完整流水线
   */
  async runFullPipeline(user_id, params) {
    const { prompt, project_id, env = 'dev' } = params;

    // 解析上下文
    const context = this.contextSystem.getContext(user_id);
    const resolvedProjectId = project_id || context?.current_project;
    const resolvedEnv = env || context?.current_env || 'dev';

    if (!resolvedProjectId) {
      throw new Error('请先指定项目');
    }

    // 创建任务
    const task = this.taskSystem.create({
      project_id: resolvedProjectId,
      type: TASK_TYPES.FULL_PIPELINE,
      env: resolvedEnv,
      description: prompt,
      user_id
    });

    try {
      // 1. AI代码生成
      this.taskSystem.updateProgress(task.task_id, 10, 'AI代码生成');
      await this.aiWorker.execute(task.task_id, { prompt, project_id: resolvedProjectId });

      // 2. Git提交
      this.taskSystem.updateProgress(task.task_id, 35, 'Git提交');
      await this.gitWorker.execute(task.task_id, { project_id: resolvedProjectId, message: prompt });

      // 3. 构建
      this.taskSystem.updateProgress(task.task_id, 50, '构建项目');
      await this.buildWorker.execute(task.task_id, { project_id: resolvedProjectId });

      // 4. 部署
      this.taskSystem.updateProgress(task.task_id, 75, '部署项目');
      await this.deployWorker.execute(task.task_id, { project_id: resolvedProjectId, env: resolvedEnv });

      // 完成
      this.taskSystem.update(task.task_id, {
        status: TASK_STATUS.SUCCESS,
        progress: 100,
        current_step: '完成'
      });

      this.stateSystem.updateStatus(task.task_id, 'verify', STATE_STATUS.SUCCESS);

      return this.taskSystem.get(task.task_id);

    } catch (error) {
      this.taskSystem.update(task.task_id, {
        status: TASK_STATUS.FAILED,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 仅执行代码生成
   */
  async runCodegen(user_id, params) {
    const { prompt, project_id } = params;

    const context = this.contextSystem.getContext(user_id);
    const resolvedProjectId = project_id || context?.current_project;

    if (!resolvedProjectId) {
      throw new Error('请先指定项目');
    }

    const task = this.taskSystem.create({
      project_id: resolvedProjectId,
      type: TASK_TYPES.CODEGEN,
      description: prompt,
      user_id
    });

    try {
      const result = await this.aiWorker.execute(task.task_id, { prompt, project_id: resolvedProjectId });

      this.taskSystem.update(task.task_id, {
        status: TASK_STATUS.SUCCESS,
        progress: 100,
        result
      });

      return this.taskSystem.get(task.task_id);

    } catch (error) {
      this.taskSystem.update(task.task_id, {
        status: TASK_STATUS.FAILED,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 仅执行构建
   */
  async runBuild(user_id, params) {
    const { project_id, build_command } = params;

    const context = this.contextSystem.getContext(user_id);
    const resolvedProjectId = project_id || context?.current_project;

    if (!resolvedProjectId) {
      throw new Error('请先指定项目');
    }

    const task = this.taskSystem.create({
      project_id: resolvedProjectId,
      type: TASK_TYPES.BUILD,
      user_id
    });

    try {
      const result = await this.buildWorker.execute(task.task_id, { project_id: resolvedProjectId, build_command });

      this.taskSystem.update(task.task_id, {
        status: TASK_STATUS.SUCCESS,
        progress: 100,
        result
      });

      return this.taskSystem.get(task.task_id);

    } catch (error) {
      this.taskSystem.update(task.task_id, {
        status: TASK_STATUS.FAILED,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 仅执行部署
   */
  async runDeploy(user_id, params) {
    const { project_id, env } = params;

    const context = this.contextSystem.getContext(user_id);
    const resolvedProjectId = project_id || context?.current_project;
    const resolvedEnv = env || context?.current_env || 'dev';

    if (!resolvedProjectId) {
      throw new Error('请先指定项目');
    }

    // 生产环境需要确认
    if (resolvedEnv === 'prod') {
      const confirmation = this.security.requestConfirmation({
        user_id,
        action: 'deploy',
        project_id: resolvedProjectId,
        env: resolvedEnv
      });

      return {
        requiresConfirmation: true,
        confirmation_id: confirmation.confirmation_id,
        message: confirmation.message
      };
    }

    const task = this.taskSystem.create({
      project_id: resolvedProjectId,
      type: TASK_TYPES.DEPLOY,
      env: resolvedEnv,
      user_id
    });

    try {
      const result = await this.deployWorker.execute(task.task_id, { project_id: resolvedProjectId, env: resolvedEnv });

      this.taskSystem.update(task.task_id, {
        status: TASK_STATUS.SUCCESS,
        progress: 100,
        result
      });

      return this.taskSystem.get(task.task_id);

    } catch (error) {
      this.taskSystem.update(task.task_id, {
        status: TASK_STATUS.FAILED,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 确认操作
   */
  confirmOperation(confirmation_id, approved, user_id) {
    return this.security.confirm(confirmation_id, approved, user_id);
  }

  /**
   * 获取任务历史
   */
  getTaskHistory(project_id, options = {}) {
    return this.taskSystem.getByProject(project_id, options);
  }

  /**
   * 获取项目记忆
   */
  getProjectMemory(project_id, limit = 10) {
    return this.memorySystem.getRecentContext(project_id, limit);
  }

  /**
   * 注册通知渠道
   */
  registerNotificationChannel(name, config) {
    this.notificationSystem.registerChannel(name, config);
  }
}

// 单例
let instance = null;

function getAIDevOps() {
  if (!instance) {
    instance = new AIDevOps();
  }
  return instance;
}

module.exports = {
  AIDevOps,
  getAIDevOps,
  TASK_TYPES,
  TASK_STATUS,
  STATE_STATUS
};
