/**
 * 状态系统 (State System)
 * 统一状态源，支持多方状态同步
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../../data/states.json');

// 状态枚举
const STATE_STATUS = {
  IDLE: 'idle',
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed'
};

class StateSystem {
  constructor() {
    this.states = this.load();
    this.listeners = new Map();
  }

  load() {
    try {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  save() {
    fs.writeFileSync(STATE_FILE, JSON.stringify(this.states, null, 2));
  }

  /**
   * 初始化任务状态
   * @param {string} task_id - 任务ID
   * @returns {Object} 初始化的状态
   */
  initTaskState(task_id) {
    if (this.states[task_id]) {
      return this.states[task_id];
    }

    const state = {
      task_id,
      ai_status: STATE_STATUS.IDLE,
      git_status: STATE_STATUS.IDLE,
      build_status: STATE_STATUS.IDLE,
      deploy_status: STATE_STATUS.IDLE,
      verify_status: STATE_STATUS.IDLE,
      combined_status: STATE_STATUS.IDLE,
      last_updated: new Date().toISOString(),
      history: []
    };

    this.states[task_id] = state;
    this.save();

    return state;
  }

  /**
   * 更新单个状态
   * @param {string} task_id - 任务ID
   * @param {string} statusType - 状态类型 (ai/git/build/deploy/verify)
   * @param {string} status - 状态值
   * @param {Object} metadata - 附加元数据
   * @returns {Object} 更新后的状态
   */
  updateStatus(task_id, statusType, status, metadata = {}) {
    if (!this.states[task_id]) {
      this.initTaskState(task_id);
    }

    const state = this.states[task_id];
    const statusKey = statusType + '_status';

    if (!state[statusKey]) {
      throw new Error('无效的状态类型: ' + statusType);
    }

    const oldStatus = state[statusKey];
    state[statusKey] = status;
    state.last_updated = new Date().toISOString();

    // 记录历史
    state.history.push({
      type: statusType,
      from: oldStatus,
      to: status,
      metadata,
      timestamp: new Date().toISOString()
    });

    // 更新综合状态
    state.combined_status = this.calculateCombinedStatus(state);

    this.save();

    // 触发事件
    this.emit(task_id, 'status_updated', {
      type: statusType,
      oldStatus,
      newStatus: status,
      combinedStatus: state.combined_status
    });

    return state;
  }

  /**
   * 计算综合状态
   * @param {Object} state - 状态对象
   * @returns {string} 综合状态
   */
  calculateCombinedStatus(state) {
    const statuses = [
      state.ai_status,
      state.git_status,
      state.build_status,
      state.deploy_status,
      state.verify_status
    ];

    // 如果任何一个是失败，综合状态为失败
    if (statuses.includes(STATE_STATUS.FAILED)) {
      return STATE_STATUS.FAILED;
    }

    // 如果任何一个是运行中，综合状态为运行中
    if (statuses.includes(STATE_STATUS.RUNNING)) {
      return STATE_STATUS.RUNNING;
    }

    // 如果任何一个是待处理，综合状态为待处理
    if (statuses.includes(STATE_STATUS.PENDING)) {
      return STATE_STATUS.PENDING;
    }

    // 如果全部成功，综合状态为成功
    if (statuses.every(s => s === STATE_STATUS.SUCCESS)) {
      return STATE_STATUS.SUCCESS;
    }

    // 默认空闲
    return STATE_STATUS.IDLE;
  }

  /**
   * 批量更新状态（三方同步）
   * @param {string} task_id - 任务ID
   * @param {Object} updates - 状态更新
   * @returns {Object} 更新后的状态
   */
  syncStatus(task_id, updates) {
    if (!this.states[task_id]) {
      this.initTaskState(task_id);
    }

    const state = this.states[task_id];

    Object.keys(updates).forEach(statusType => {
      const statusKey = statusType + '_status';
      if (state[statusKey]) {
        const oldStatus = state[statusKey];
        const newStatus = updates[statusType];
        
        state[statusKey] = newStatus;
        state.history.push({
          type: statusType,
          from: oldStatus,
          to: newStatus,
          timestamp: new Date().toISOString()
        });
      }
    });

    state.combined_status = this.calculateCombinedStatus(state);
    state.last_updated = new Date().toISOString();

    this.save();
    this.emit(task_id, 'synced', state);

    return state;
  }

  /**
   * 处理状态冲突
   * @param {string} task_id - 任务ID
   * @param {Object} externalState - 外部状态
   * @returns {Object} 合并后的状态
   */
  resolveConflict(task_id, externalState) {
    if (!this.states[task_id]) {
      this.states[task_id] = externalState;
      this.save();
      return externalState;
    }

    const localState = this.states[task_id];
    const localTime = new Date(localState.last_updated).getTime();
    const externalTime = new Date(externalState.last_updated).getTime();

    // 简单策略：以时间戳较新的为准
    if (externalTime > localTime) {
      this.states[task_id] = {
        ...localState,
        ...externalState,
        history: [...localState.history, ...externalState.history]
      };
    } else {
      // 本地更新，合并历史
      this.states[task_id].history.push({
        type: 'conflict_resolved',
        message: '保留本地状态',
        timestamp: new Date().toISOString()
      });
    }

    this.save();
    return this.states[task_id];
  }

  /**
   * 获取任务状态
   * @param {string} task_id - 任务ID
   * @returns {Object|null} 任务状态
   */
  getState(task_id) {
    return this.states[task_id] || null;
  }

  /**
   * 获取所有进行中的任务
   * @returns {Array} 进行中的任务列表
   */
  getActiveTasks() {
    return Object.values(this.states).filter(
      s => s.combined_status === STATE_STATUS.RUNNING || s.combined_status === STATE_STATUS.PENDING
    );
  }

  /**
   * 删除任务状态
   * @param {string} task_id - 任务ID
   * @returns {boolean} 是否删除成功
   */
  deleteState(task_id) {
    if (!this.states[task_id]) {
      return false;
    }

    delete this.states[task_id];
    this.save();
    return true;
  }

  /**
   * 注册事件监听器
   */
  on(task_id, event, callback) {
    const key = task_id + ':' + event;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
  }

  /**
   * 触发事件
   */
  emit(task_id, event, data) {
    const key = task_id + ':' + event;
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

let instance = null;

function getStateSystem() {
  if (!instance) {
    instance = new StateSystem();
  }
  return instance;
}

module.exports = {
  StateSystem,
  getStateSystem,
  STATE_STATUS
};
