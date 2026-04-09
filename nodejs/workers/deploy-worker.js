/**
 * Deploy Worker
 * 执行部署任务
 */

const { getTaskSystem, TASK_STATUS } = require('../lib/task-system');
const { getMemorySystem } = require('../lib/memory-system');
const { getStateSystem, STATE_STATUS } = require('../lib/state-system');
const { getNotificationSystem } = require('../lib/notification');
const { getProjectRegistry } = require('../lib/project-registry');
const { getSecurity } = require('../lib/security');
const { exec } = require('child_process');

class DeployWorker {
  constructor() {
    this.taskSystem = getTaskSystem();
    this.memorySystem = getMemorySystem();
    this.stateSystem = getStateSystem();
    this.notificationSystem = getNotificationSystem();
    this.projectRegistry = getProjectRegistry();
    this.security = getSecurity();
  }

  async execute(task_id, params) {
    const { project_id, env, deploy_command } = params;

    const task = this.taskSystem.get(task_id);
    if (!task) throw new Error('任务不存在: ' + task_id);

    const project = this.projectRegistry.get(project_id);
    if (!project) throw new Error('项目不存在: ' + project_id);

    try {
      this.stateSystem.updateStatus(task_id, 'deploy', STATE_STATUS.RUNNING);
      this.taskSystem.updateProgress(task_id, 75, '开始部署');
      this.taskSystem.addLog(task_id, 'Deploy Worker 开始执行, 环境: ' + env, 'info');

      const cmd = deploy_command || this.getDefaultDeployCommand(project, env);
      const result = await this.runDeploy(task_id, project.path, cmd);

      this.stateSystem.updateStatus(task_id, 'deploy', STATE_STATUS.SUCCESS);
      this.taskSystem.updateProgress(task_id, 90, '部署完成');
      this.taskSystem.addLog(task_id, '部署成功', 'info');

      this.memorySystem.addMemory({
        project_id,
        type: 'deploy',
        content: '部署完成到 ' + env + ' 环境',
        metadata: { task_id, env }
      });

      await this.notificationSystem.notifyDeploy(task_id, 'success', env, { project_id });

      return { success: true, output: result, env };

    } catch (error) {
      this.stateSystem.updateStatus(task_id, 'deploy', STATE_STATUS.FAILED);
      this.taskSystem.addLog(task_id, '部署失败: ' + error.message, 'error');
      await this.notificationSystem.notifyDeploy(task_id, 'failed', env, { project_id, error: error.message });
      throw error;
    }
  }

  getDefaultDeployCommand(project, env) {
    const deployType = project.deploy_type || 'docker';
    const server = project.servers?.[env] || 'localhost';

    const commands = {
      docker: 'docker run -d --name ' + project.name + ' -p 3000:3000 ' + project.name + ':latest',
      ssh: 'ssh ' + server + ' "cd /var/www/' + project.name + ' && git pull && npm install && pm2 restart"',
      kubectl: 'kubectl set image deployment/' + project.name + ' ' + project.name + '=' + project.name + ':latest'
    };

    return commands[deployType] || commands.docker;
  }

  async runDeploy(task_id, projectPath, command) {
    this.taskSystem.addLog(task_id, '执行: ' + command, 'info');

    return new Promise((resolve, reject) => {
      exec(command, { cwd: projectPath, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error('部署失败: ' + stderr));
        } else {
          resolve(stdout);
        }
      });
    });
  }
}

let instance = null;

function getDeployWorker() {
  if (!instance) instance = new DeployWorker();
  return instance;
}

module.exports = { DeployWorker, getDeployWorker };
