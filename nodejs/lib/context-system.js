/**
 * 用户上下文系统 (Context System)
 * 管理用户会话上下文，支持多用户、多项目切换
 */

const fs = require('fs');
const path = require('path');

const CONTEXTS_FILE = path.join(__dirname, '../../data/contexts.json');

class ContextSystem {
  constructor() {
    this.contexts = this.load();
  }

  /**
   * 加载上下文数据
   */
  load() {
    try {
      const data = fs.readFileSync(CONTEXTS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  /**
   * 保存上下文数据
   */
  save() {
    fs.writeFileSync(CONTEXTS_FILE, JSON.stringify(this.contexts, null, 2));
  }

  /**
   * 创建或获取用户上下文
   * @param {string} user_id - 用户ID
   * @returns {Object} 用户上下文
   */
  getOrCreateContext(user_id) {
    let context = this.contexts.find(c => c.user_id === user_id);

    if (!context) {
      context = {
        user_id,
        current_project: null,
        current_env: 'dev',
        last_task_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.contexts.push(context);
      this.save();
    }

    return context;
  }

  /**
   * 切换项目
   * @param {string} user_id - 用户ID
   * @param {string} project_id - 项目ID
   * @returns {Object} 更新后的上下文
   */
  switchProject(user_id, project_id) {
    const context = this.getOrCreateContext(user_id);
    context.current_project = project_id;
    context.updated_at = new Date().toISOString();
    this.save();
    return context;
  }

  /**
   * 切换环境
   * @param {string} user_id - 用户ID
   * @param {string} env - 环境名称 (dev/prod)
   * @returns {Object} 更新后的上下文
   */
  switchEnv(user_id, env) {
    if (!['dev', 'prod'].includes(env)) {
      throw new Error('环境必须是 dev 或 prod');
    }

    const context = this.getOrCreateContext(user_id);
    context.current_env = env;
    context.updated_at = new Date().toISOString();
    this.save();
    return context;
  }

  /**
   * 更新最后任务ID
   * @param {string} user_id - 用户ID
   * @param {string} task_id - 任务ID
   */
  updateLastTask(user_id, task_id) {
    const context = this.getOrCreateContext(user_id);
    context.last_task_id = task_id;
    context.updated_at = new Date().toISOString();
    this.save();
  }

  /**
   * 获取用户上下文
   * @param {string} user_id - 用户ID
   * @returns {Object|null} 用户上下文
   */
  getContext(user_id) {
    return this.contexts.find(c => c.user_id === user_id) || null;
  }

  /**
   * 解析命令中的项目引用
   * 如果命令中没有明确指定项目，使用当前上下文项目
   * @param {string} user_id - 用户ID
   * @param {Object} command - 命令对象
   * @returns {Object} 解析后的命令（包含project_id）
   */
  resolveProject(user_id, command) {
    const context = this.getContext(user_id);

    if (!context || !context.current_project) {
      throw new Error('请先切换到指定项目，使用: switchProject <project_id>');
    }

    // 如果命令中没有指定项目，使用上下文中的项目
    if (!command.project_id) {
      command.project_id = context.current_project;
    }

    // 如果命令中没有指定环境，使用上下文中的环境
    if (!command.env) {
      command.env = context.current_env;
    }

    return command;
  }

  /**
   * 删除用户上下文
   * @param {string} user_id - 用户ID
   * @returns {boolean} 是否删除成功
   */
  deleteContext(user_id) {
    const index = this.contexts.findIndex(c => c.user_id === user_id);
    if (index === -1) {
      return false;
    }

    this.contexts.splice(index, 1);
    this.save();
    return true;
  }
}

// 单例模式
let instance = null;

function getContextSystem() {
  if (!instance) {
    instance = new ContextSystem();
  }
  return instance;
}

module.exports = {
  ContextSystem,
  getContextSystem
};
