/**
 * 记忆系统 (Memory System)
 * 存储AI历史操作、项目上下文
 */

const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.join(__dirname, '../../data/memory.json');

class MemorySystem {
  constructor() {
    this.memories = this.load();
  }

  load() {
    try {
      const data = fs.readFileSync(MEMORY_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  save() {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(this.memories, null, 2));
  }

  /**
   * 添加记忆
   * @param {Object} params - 记忆参数
   * @returns {Object} 创建的记忆
   */
  addMemory(params) {
    const { project_id, user_id, type, content, metadata } = params;

    if (!content) {
      throw new Error('记忆内容不能为空');
    }

    const memory = {
      memory_id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      project_id: project_id || null,
      user_id: user_id || 'system',
      type: type || 'general', // general, codegen, deploy, build, etc.
      content,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    };

    this.memories.push(memory);
    this.save();

    return memory;
  }

  /**
   * 查询记忆
   * @param {Object} query - 查询条件
   * @returns {Array} 记忆列表
   */
  queryMemory(query = {}) {
    let result = [...this.memories];

    // 按项目ID筛选
    if (query.project_id) {
      result = result.filter(m => m.project_id === query.project_id);
    }

    // 按用户ID筛选
    if (query.user_id) {
      result = result.filter(m => m.user_id === query.user_id);
    }

    // 按类型筛选
    if (query.type) {
      result = result.filter(m => m.type === query.type);
    }

    // 关键词搜索
    if (query.keyword) {
      const keyword = query.keyword.toLowerCase();
      result = result.filter(m => 
        m.content.toLowerCase().includes(keyword) ||
        (m.metadata && JSON.stringify(m.metadata).toLowerCase().includes(keyword))
      );
    }

    // 按时间倒序排序
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // 限制数量
    if (query.limit) {
      result = result.slice(0, query.limit);
    }

    return result;
  }

  /**
   * 获取项目的操作历史
   * @param {string} project_id - 项目ID
   * @param {number} limit - 限制数量
   * @returns {Array} 操作历史
   */
  getProjectHistory(project_id, limit = 50) {
    return this.queryMemory({ project_id, limit });
  }

  /**
   * 获取用户的历史操作
   * @param {string} user_id - 用户ID
   * @param {number} limit - 限制数量
   * @returns {Array} 操作历史
   */
  getUserHistory(user_id, limit = 50) {
    return this.queryMemory({ user_id, limit });
  }

  /**
   * 获取最近的相关记忆（用于AI上下文）
   * @param {string} project_id - 项目ID
   * @param {number} limit - 限制数量
   * @returns {string} 格式化的记忆文本
   */
  getRecentContext(project_id, limit = 10) {
    const memories = this.queryMemory({ project_id, limit });
    
    if (memories.length === 0) {
      return '暂无历史操作记录';
    }

    return memories.map(m => {
      const time = new Date(m.created_at).toLocaleString('zh-CN');
      return '[' + time + '] ' + m.type + ': ' + m.content;
    }).join('\n');
  }

  /**
   * 删除记忆
   * @param {string} memory_id - 记忆ID
   * @returns {boolean} 是否删除成功
   */
  deleteMemory(memory_id) {
    const index = this.memories.findIndex(m => m.memory_id === memory_id);
    if (index === -1) {
      return false;
    }

    this.memories.splice(index, 1);
    this.save();
    return true;
  }

  /**
   * 清除项目的所有记忆
   * @param {string} project_id - 项目ID
   * @returns {number} 删除的记忆数量
   */
  clearProjectMemory(project_id) {
    const before = this.memories.length;
    this.memories = this.memories.filter(m => m.project_id !== project_id);
    this.save();
    return before - this.memories.length;
  }

  /**
   * 统计记忆数量
   * @param {Object} query - 查询条件
   * @returns {Object} 统计结果
   */
  stats(query = {}) {
    let filtered = this.memories;

    if (query.project_id) {
      filtered = filtered.filter(m => m.project_id === query.project_id);
    }

    if (query.user_id) {
      filtered = filtered.filter(m => m.user_id === query.user_id);
    }

    const typeCounts = {};
    filtered.forEach(m => {
      typeCounts[m.type] = (typeCounts[m.type] || 0) + 1;
    });

    return {
      total: filtered.length,
      byType: typeCounts
    };
  }
}

let instance = null;

function getMemorySystem() {
  if (!instance) {
    instance = new MemorySystem();
  }
  return instance;
}

module.exports = {
  MemorySystem,
  getMemorySystem
};
