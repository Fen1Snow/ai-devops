/**
 * 任务系统 (Task System)
 * 管理任务生命周期：创建、更新、查询、日志
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TASKS_FILE = path.join(__dirname, '../../data/tasks.json');

// 任务类型
const TASK_TYPES = {
  CODEGEN: 'codegen',
  BUILD: 'build',
  DEPLOY: 'deploy',
  SYNC_API: 'sync_api',
  FULL_PIPELINE: 'full_pipeline'
};

// 任务状态
const TASK_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

class TaskSystem {
  constructor() {
    this.tasks = this.load();
    this.listeners = new Map();
  }

  load() {
    try {
      const data = fs.readFileSync(TASKS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  save() {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(this.tasks, null, 2));
  }

  create(params) {
    const { project_id, type, env, description, user_id } = params;

    if (!project_id || !type) {
      throw new Error('project_id 和 type 为必填项');
    }

    if (!Object.values(TASK_TYPES).includes(type)) {
      throw new Error('无效的任务类型: ' + type);
    }

    const task = {
      task_id: uuidv4(),
      project_id,
      type,
      env: env || 'dev',
      description: description || '',
      user_id: user_id || 'system',
      status: TASK_STATUS.PENDING,
      progress: 0,
      current_step: '初始化',
      logs: [],
      result: null,
      error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      started_at: null,
      finished_at: null
    };

    this.tasks.push(task);
    this.save();
    this.emit(task.task_id, 'created', task);

    return task;
  }

  update(task_id, updates) {
    const task = this.tasks.find(t => t.task_id === task_id);
    if (!task) {
      return null;
    }

    const oldStatus = task.status;

    Object.assign(task, {
      ...updates,
      updated_at: new Date().toISOString()
    });

    if (updates.status === TASK_STATUS.RUNNING && !task.started_at) {
      task.started_at = new Date().toISOString();
    }

    if ([TASK_STATUS.SUCCESS, TASK_STATUS.FAILED, TASK_STATUS.CANCELLED].includes(updates.status)) {
      task.finished_at = new Date().toISOString();
    }

    this.save();

    if (oldStatus !== task.status) {
      this.emit(task_id, 'status_changed', { oldStatus, newStatus: task.status, task });
    }

    return task;
  }

  addLog(task_id, message, level = 'info') {
    const task = this.tasks.find(t => t.task_id === task_id);
    if (!task) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };

    task.logs.push(logEntry);
    this.save();
    this.emit(task_id, 'log', logEntry);
  }

  updateProgress(task_id, progress, current_step) {
    const task = this.tasks.find(t => t.task_id === task_id);
    if (!task) {
      return;
    }

    task.progress = Math.min(100, Math.max(0, progress));
    if (current_step) {
      task.current_step = current_step;
    }
    task.updated_at = new Date().toISOString();

    this.save();
    this.emit(task_id, 'progress', { progress: task.progress, current_step: task.current_step });
  }

  get(task_id) {
    return this.tasks.find(t => t.task_id === task_id) || null;
  }

  getByProject(project_id, options = {}) {
    let result = this.tasks.filter(t => t.project_id === project_id);

    if (options.status) {
      result = result.filter(t => t.status === options.status);
    }

    if (options.type) {
      result = result.filter(t => t.type === options.type);
    }

    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (options.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  getByUser(user_id, options = {}) {
    let result = this.tasks.filter(t => t.user_id === user_id);
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (options.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  getRunning() {
    return this.tasks.filter(t => t.status === TASK_STATUS.RUNNING);
  }

  cancel(task_id) {
    const task = this.tasks.find(t => t.task_id === task_id);
    if (!task) {
      return false;
    }

    if (task.status === TASK_STATUS.RUNNING) {
      task.status = TASK_STATUS.CANCELLED;
      task.finished_at = new Date().toISOString();
      this.save();
      this.emit(task_id, 'cancelled', task);
      return true;
    }

    return false;
  }

  delete(task_id) {
    const index = this.tasks.findIndex(t => t.task_id === task_id);
    if (index === -1) {
      return false;
    }

    this.tasks.splice(index, 1);
    this.save();
    return true;
  }

  on(task_id, event, callback) {
    const key = task_id + ':' + event;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
  }

  off(task_id, event, callback) {
    const key = task_id + ':' + event;
    if (!this.listeners.has(key)) {
      return;
    }

    const callbacks = this.listeners.get(key);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(task_id, event, data) {
    const key = task_id + ':' + event;
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }

    const globalKey = '*:' + event;
    const globalCallbacks = this.listeners.get(globalKey);
    if (globalCallbacks) {
      globalCallbacks.forEach(cb => cb({ task_id, event, data }));
    }
  }
}

let instance = null;

function getTaskSystem() {
  if (!instance) {
    instance = new TaskSystem();
  }
  return instance;
}

module.exports = {
  TaskSystem,
  getTaskSystem,
  TASK_TYPES,
  TASK_STATUS
};
