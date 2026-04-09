/**
 * 安全机制 (Security)
 * 生产环境操作确认、防止误部署
 */

const fs = require('fs');
const path = require('path');

const CONFIRMATIONS_FILE = path.join(__dirname, '../../data/confirmations.json');

class Security {
  constructor() {
    this.confirmations = this.load();
    this.pendingConfirmations = new Map();
  }

  load() {
    try {
      const data = fs.readFileSync(CONFIRMATIONS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  save() {
    fs.writeFileSync(CONFIRMATIONS_FILE, JSON.stringify(this.confirmations, null, 2));
  }

  /**
   * 请求确认操作
   * @param {Object} params - 确认参数
   * @returns {Object} 确认请求
   */
  requestConfirmation(params) {
    const { user_id, action, project_id, env, details, expires_in = 300 } = params;

    // 生产环境必须确认
    if (env !== 'prod') {
      // 非生产环境直接返回确认
      return {
        confirmation_id: null,
        required: false,
        message: '非生产环境，无需确认'
      };
    }

    const confirmation_id = 'confirm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const confirmation = {
      confirmation_id,
      user_id,
      action,
      project_id,
      env,
      details,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + expires_in * 1000).toISOString()
    };

    this.confirmations.push(confirmation);
    this.pendingConfirmations.set(confirmation_id, confirmation);
    this.save();

    return {
      confirmation_id,
      required: true,
      message: '生产环境操作需要确认，请在 ' + expires_in + ' 秒内回复 yes/no',
      details: {
        action,
        project_id,
        env,
        ...details
      }
    };
  }

  /**
   * 确认操作
   * @param {string} confirmation_id - 确认ID
   * @param {boolean} approved - 是否批准
   * @param {string} user_id - 用户ID
   * @returns {Object} 确认结果
   */
  confirm(confirmation_id, approved, user_id) {
    const confirmation = this.pendingConfirmations.get(confirmation_id);

    if (!confirmation) {
      // 从存储中查找
      const stored = this.confirmations.find(c => c.confirmation_id === confirmation_id);
      if (!stored) {
        return {
          success: false,
          error: '确认请求不存在'
        };
      }
      
      if (stored.status !== 'pending') {
        return {
          success: false,
          error: '确认请求已处理: ' + stored.status
        };
      }

      return this.processConfirmation(stored, approved, user_id);
    }

    // 检查是否过期
    if (new Date() > new Date(confirmation.expires_at)) {
      confirmation.status = 'expired';
      this.pendingConfirmations.delete(confirmation_id);
      this.save();

      return {
        success: false,
        error: '确认请求已过期'
      };
    }

    return this.processConfirmation(confirmation, approved, user_id);
  }

  /**
   * 处理确认
   */
  processConfirmation(confirmation, approved, user_id) {
    confirmation.status = approved ? 'approved' : 'rejected';
    confirmation.confirmed_by = user_id;
    confirmation.confirmed_at = new Date().toISOString();

    this.pendingConfirmations.delete(confirmation.confirmation_id);
    this.save();

    return {
      success: true,
      approved,
      message: approved ? '操作已确认，可以继续执行' : '操作已被拒绝'
    };
  }

  /**
   * 检查是否需要确认
   * @param {string} action - 操作类型
   * @param {string} env - 环境
   * @returns {boolean} 是否需要确认
   */
  requiresConfirmation(action, env) {
    // 生产环境的部署和构建操作需要确认
    if (env === 'prod') {
      const protectedActions = ['deploy', 'build', 'delete', 'reset'];
      return protectedActions.includes(action);
    }
    return false;
  }

  /**
   * 检查确认状态
   * @param {string} confirmation_id - 确认ID
   * @returns {Object|null} 确认状态
   */
  getConfirmationStatus(confirmation_id) {
    const confirmation = this.confirmations.find(c => c.confirmation_id === confirmation_id);
    return confirmation || null;
  }

  /**
   * 清理过期的确认请求
   */
  cleanupExpired() {
    const now = new Date();
    const expired = [];

    this.confirmations = this.confirmations.filter(c => {
      if (c.status === 'pending' && new Date(c.expires_at) < now) {
        c.status = 'expired';
        expired.push(c.confirmation_id);
        return true; // 保留过期记录
      }
      return true;
    });

    // 清理内存中的过期确认
    expired.forEach(id => {
      this.pendingConfirmations.delete(id);
    });

    this.save();
    return expired.length;
  }

  /**
   * 获取用户的待确认请求
   * @param {string} user_id - 用户ID
   * @returns {Array} 待确认请求列表
   */
  getPendingConfirmations(user_id) {
    return this.confirmations.filter(c => 
      c.user_id === user_id && c.status === 'pending'
    );
  }

  /**
   * 验证权限
   * @param {string} user_id - 用户ID
   * @param {string} action - 操作
   * @param {string} project_id - 项目ID
   * @param {string} env - 环境
   * @returns {Object} 验证结果
   */
  validatePermission(user_id, action, project_id, env) {
    // 基础权限检查（可扩展为数据库查询）
    const result = {
      allowed: true,
      requiresConfirmation: this.requiresConfirmation(action, env)
    };

    // 可以在这里添加更复杂的权限逻辑
    // 例如：检查用户是否有权限操作该项目
    // 检查用户是否有权限操作生产环境

    return result;
  }
}

let instance = null;

function getSecurity() {
  if (!instance) {
    instance = new Security();
  }
  return instance;
}

module.exports = {
  Security,
  getSecurity
};
