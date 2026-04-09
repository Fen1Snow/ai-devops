/**
 * Build Worker
 * 执行构建任务
 */

const { getTaskSystem, TASK_STATUS } = require('../lib/task-system');
const { getMemorySystem } = require('../lib/memory-system');
const { getStateSystem, STATE_STATUS } = require('../lib/state-system');
const { getNotificationSystem } = require('../lib/notification');
const { getProjectRegistry } = require('../lib/project-registry');
const { exec } = require('child_process');

class BuildWorker {
  constructor() {
    this.taskSystem = getTaskSystem();
    this.memorySystem = getMemorySystem();
    this.stateSystem = getStateSystem();
    this.notificationSystem = getNotificationSystem();
    this.projectRegistry = getProjectRegistry();
  }

  async execute(task_id, params) {
    const { project_id, build_command } = params;

    const task = this.taskSystem.get(task_id);
    if (!task) throw new Error('任务不存在: ' + task_id);

    const project = this.projectRegistry.get(project_id);
    if (!project) throw new Error('项目不存在: ' + project_id);

    try {
      this.stateSystem.updateStatus(task_id, 'build', STATE_STATUS.RUNNING);
      this.taskSystem.updateProgress(task_id, 50, '开始构建');
      this.taskSystem.addLog(task_id, 'Build Worker 开始执行', 'info');

      const cmd = build_command || this.getDefaultBuildCommand(project);
      const result = await this.runBuild(task_id, project.path, cmd);

      this.stateSystem.updateStatus(task_id, 'build', STATE_STATUS.SUCCESS);
      this.taskSystem.updateProgress(task_id, 70, '构建完成');
      this.taskSystem.addLog(task_id, '构建成功', 'info');

      this.memorySystem.addMemory({
        project_id,
        type: 'build',
        content: '构建完成: ' + cmd,
        metadata: { task_id }
      });

      await this.notificationSystem.notifyBuild(task_id, 'success', { project_id });

      return { success: true, output: result };

    } catch (error) {
      this.stateSystem.updateStatus(task_id, 'build', STATE_STATUS.FAILED);
      this.taskSystem.addLog(task_id, '构建失败: ' + error.message, 'error');
      await this.notificationSystem.notifyBuild(task_id, 'failed', { project_id, error: error.message });
      throw error;
    }
  }

  getDefaultBuildCommand(project) {
    const deployType = project.deploy_type || 'docker';
    const commands = {
      docker: 'docker build -t ' + project.name + ':latest .',
      npm: 'npm run build',
      cargo: 'cargo build --release'
    };
    return commands[deployType] || 'npm run build';
  }

  async runBuild(task_id, projectPath, command) {
    this.taskSystem.addLog(task_id, '执行: ' + command, 'info');

    return new Promise((resolve, reject) => {
      exec(command, { cwd: projectPath, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error('构建失败: ' + stderr));
        } else {
          resolve(stdout);
        }
      });
    });
  }
}

let instance = null;

function getBuildWorker() {
  if (!instance) instance = new BuildWorker();
  return instance;
}

module.exports = { BuildWorker, getBuildWorker };
