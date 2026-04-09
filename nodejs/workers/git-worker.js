/**
 * Git Worker
 * 执行Git操作：commit/push
 */

const { getTaskSystem, TASK_STATUS } = require('../lib/task-system');
const { getMemorySystem } = require('../lib/memory-system');
const { getStateSystem, STATE_STATUS } = require('../lib/state-system');
const { getNotificationSystem } = require('../lib/notification');
const { getProjectRegistry } = require('../lib/project-registry');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class GitWorker {
  constructor() {
    this.taskSystem = getTaskSystem();
    this.memorySystem = getMemorySystem();
    this.stateSystem = getStateSystem();
    this.notificationSystem = getNotificationSystem();
    this.projectRegistry = getProjectRegistry();
  }

  /**
   * 执行Git任务
   * @param {string} task_id - 任务ID
   * @param {Object} params - 参数
   */
  async execute(task_id, params) {
    const { project_id, message, branch = 'main' } = params;

    const task = this.taskSystem.get(task_id);
    if (!task) {
      throw new Error('任务不存在: ' + task_id);
    }

    const project = this.projectRegistry.get(project_id);
    if (!project) {
      throw new Error('项目不存在: ' + project_id);
    }

    try {
      this.stateSystem.updateStatus(task_id, 'git', STATE_STATUS.RUNNING);
      this.taskSystem.updateProgress(task_id, 35, '开始Git操作');
      this.taskSystem.addLog(task_id, 'Git Worker 开始执行', 'info');

      // 执行 git add
      await this.gitAdd(task_id, project.path);

      // 执行 git commit
      const commitHash = await this.gitCommit(task_id, project.path, message || 'AI自动提交: ' + new Date().toISOString());

      // 执行 git push
      await this.gitPush(task_id, project.path, branch);

      this.stateSystem.updateStatus(task_id, 'git', STATE_STATUS.SUCCESS);
      this.taskSystem.updateProgress(task_id, 40, 'Git提交完成');
      this.taskSystem.addLog(task_id, 'Git操作完成, commit: ' + commitHash, 'info');

      // 记录到记忆系统
      this.memorySystem.addMemory({
        project_id,
        type: 'git_commit',
        content: 'Git提交: ' + message,
        metadata: { task_id, commitHash, branch }
      });

      await this.notificationSystem.notifyProgress(task_id, 40, 'Git提交完成');

      return { success: true, commitHash, branch };

    } catch (error) {
      this.stateSystem.updateStatus(task_id, 'git', STATE_STATUS.FAILED);
      this.taskSystem.addLog(task_id, 'Git操作失败: ' + error.message, 'error');

      throw error;
    }
  }

  /**
   * Git add
   */
  async gitAdd(task_id, projectPath) {
    this.taskSystem.addLog(task_id, '执行 git add .', 'info');

    return new Promise((resolve, reject) => {
      exec('git add .', { cwd: projectPath }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error('git add 失败: ' + error.message));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * Git commit
   */
  async gitCommit(task_id, projectPath, message) {
    this.taskSystem.addLog(task_id, '执行 git commit: ' + message, 'info');

    return new Promise((resolve, reject) => {
      exec('git commit -m "' + message + '"', { cwd: projectPath }, (error, stdout, stderr) => {
        if (error) {
          // 可能没有变更需要提交
          if (stderr.includes('nothing to commit')) {
            resolve(null);
          } else {
            reject(new Error('git commit 失败: ' + error.message));
          }
        } else {
          // 提取 commit hash
          const match = stdout.match(/\[.*? ([a-f0-9]+)\]/);
          resolve(match ? match[1] : null);
        }
      });
    });
  }

  /**
   * Git push
   */
  async gitPush(task_id, projectPath, branch) {
    this.taskSystem.addLog(task_id, '执行 git push origin ' + branch, 'info');

    return new Promise((resolve, reject) => {
      exec('git push origin ' + branch, { cwd: projectPath }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error('git push 失败: ' + error.message));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * 获取项目状态
   */
  async getStatus(projectPath) {
    return new Promise((resolve, reject) => {
      exec('git status --porcelain', { cwd: projectPath }, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  /**
   * 获取最后提交
   */
  async getLastCommit(projectPath) {
    return new Promise((resolve, reject) => {
      exec('git log -1 --pretty=format:"%H %s"', { cwd: projectPath }, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }
}

let instance = null;

function getGitWorker() {
  if (!instance) {
    instance = new GitWorker();
  }
  return instance;
}

module.exports = {
  GitWorker,
  getGitWorker
};
