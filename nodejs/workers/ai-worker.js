/**
 * AI Worker
 * 调用AI生成代码
 */

const { getTaskSystem, TASK_STATUS } = require('../lib/task-system');
const { getMemorySystem } = require('../lib/memory-system');
const { getStateSystem, STATE_STATUS } = require('../lib/state-system');
const { getNotificationSystem } = require('../lib/notification');
const { getProjectRegistry } = require('../lib/project-registry');
const { spawn } = require('child_process');
const path = require('path');

class AIWorker {
  constructor() {
    this.taskSystem = getTaskSystem();
    this.memorySystem = getMemorySystem();
    this.stateSystem = getStateSystem();
    this.notificationSystem = getNotificationSystem();
    this.projectRegistry = getProjectRegistry();
  }

  /**
   * 执行AI代码生成任务
   * @param {string} task_id - 任务ID
   * @param {Object} params - 参数
   */
  async execute(task_id, params) {
    const { prompt, files, project_id } = params;

    const task = this.taskSystem.get(task_id);
    if (!task) {
      throw new Error('任务不存在: ' + task_id);
    }

    try {
      // 更新状态
      this.taskSystem.update(task_id, { status: TASK_STATUS.RUNNING });
      this.stateSystem.initTaskState(task_id);
      this.stateSystem.updateStatus(task_id, 'ai', STATE_STATUS.RUNNING);

      this.taskSystem.updateProgress(task_id, 10, '开始AI代码生成');
      this.taskSystem.addLog(task_id, 'AI Worker 开始执行', 'info');

      // 记录到记忆系统
      this.memorySystem.addMemory({
        project_id,
        type: 'codegen',
        content: '开始生成代码: ' + prompt,
        metadata: { task_id }
      });

      // 模拟AI调用（实际项目中调用Claude Code CLI或其他AI服务）
      const result = await this.callAI(task_id, prompt, files, project_id);

      // 更新状态
      this.taskSystem.updateProgress(task_id, 30, '代码生成完成');
      this.stateSystem.updateStatus(task_id, 'ai', STATE_STATUS.SUCCESS);
      this.taskSystem.addLog(task_id, 'AI代码生成完成', 'info');

      // 记录结果
      this.memorySystem.addMemory({
        project_id,
        type: 'codegen_complete',
        content: '代码生成完成，生成文件: ' + result.files.length + ' 个',
        metadata: { task_id, files: result.files }
      });

      // 发送通知
      await this.notificationSystem.notifyProgress(task_id, 30, '代码生成完成', {
        project_id,
        files_count: result.files.length
      });

      return result;

    } catch (error) {
      this.taskSystem.update(task_id, {
        status: TASK_STATUS.FAILED,
        error: error.message
      });
      this.stateSystem.updateStatus(task_id, 'ai', STATE_STATUS.FAILED);
      this.taskSystem.addLog(task_id, 'AI代码生成失败: ' + error.message, 'error');

      throw error;
    }
  }

  /**
   * 调用AI服务
   */
  async callAI(task_id, prompt, files, project_id) {
    const project = this.projectRegistry.get(project_id);
    
    // 模拟AI生成结果
    // 实际项目中可以调用Claude Code CLI: spawn('claude', ['code', prompt])
    this.taskSystem.addLog(task_id, '调用AI服务处理提示: ' + prompt, 'info');

    // 模拟生成过程
    await this.delay(1000);

    // 返回模拟结果
    return {
      success: true,
      files: files || ['src/generated.js'],
      message: '代码生成成功',
      prompt: prompt
    };
  }

  /**
   * 使用Claude Code CLI执行（实际实现）
   */
  async executeWithClaudeCode(task_id, prompt, projectPath) {
    return new Promise((resolve, reject) => {
      const claude = spawn('claude', ['code', prompt], {
        cwd: projectPath,
        shell: true
      });

      let output = '';
      let error = '';

      claude.stdout.on('data', (data) => {
        output += data.toString();
        this.taskSystem.addLog(task_id, data.toString(), 'info');
      });

      claude.stderr.on('data', (data) => {
        error += data.toString();
        this.taskSystem.addLog(task_id, data.toString(), 'warn');
      });

      claude.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output });
        } else {
          reject(new Error('Claude Code执行失败: ' + error));
        }
      });
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

let instance = null;

function getAIWorker() {
  if (!instance) {
    instance = new AIWorker();
  }
  return instance;
}

module.exports = {
  AIWorker,
  getAIWorker
};
