/**
 * 项目注册表 (Project Registry)
 * 管理所有注册的项目信息
 */

const fs = require('fs');
const path = require('path');

const PROJECTS_FILE = path.join(__dirname, '../../data/projects.json');

class ProjectRegistry {
  constructor() {
    this.projects = this.load();
  }

  /**
   * 加载项目数据
   */
  load() {
    try {
      const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  /**
   * 保存项目数据
   */
  save() {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(this.projects, null, 2));
  }

  /**
   * 注册新项目
   * @param {Object} project - 项目信息
   * @returns {Object} 注册后的项目
   */
  register(project) {
    const { name, repo, path: projectPath, servers, deploy_type } = project;

    if (!name || !repo || !projectPath) {
      throw new Error('项目名称、仓库地址和路径为必填项');
    }

    // 检查项目名是否已存在
    const existing = this.projects.find(p => p.name === name);
    if (existing) {
      throw new Error(`项目 "${name}" 已存在`);
    }

    const project_id = this.generateId();

    const newProject = {
      project_id,
      name,
      repo,
      path: projectPath,
      servers: servers || { dev: '', prod: '' },
      deploy_type: deploy_type || 'docker',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.projects.push(newProject);
    this.save();

    return newProject;
  }

  /**
   * 获取项目
   * @param {string} project_id - 项目ID
   * @returns {Object|null} 项目信息
   */
  get(project_id) {
    return this.projects.find(p => p.project_id === project_id) || null;
  }

  /**
   * 根据名称获取项目
   * @param {string} name - 项目名称
   * @returns {Object|null} 项目信息
   */
  getByName(name) {
    return this.projects.find(p => p.name === name) || null;
  }

  /**
   * 获取所有项目
   * @returns {Array} 项目列表
   */
  getAll() {
    return this.projects;
  }

  /**
   * 更新项目
   * @param {string} project_id - 项目ID
   * @param {Object} updates - 更新内容
   * @returns {Object|null} 更新后的项目
   */
  update(project_id, updates) {
    const index = this.projects.findIndex(p => p.project_id === project_id);
    if (index === -1) {
      return null;
    }

    this.projects[index] = {
      ...this.projects[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.save();
    return this.projects[index];
  }

  /**
   * 删除项目
   * @param {string} project_id - 项目ID
   * @returns {boolean} 是否删除成功
   */
  delete(project_id) {
    const index = this.projects.findIndex(p => p.project_id === project_id);
    if (index === -1) {
      return false;
    }

    this.projects.splice(index, 1);
    this.save();
    return true;
  }

  /**
   * 生成项目ID
   */
  generateId() {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 单例模式
let instance = null;

function getProjectRegistry() {
  if (!instance) {
    instance = new ProjectRegistry();
  }
  return instance;
}

module.exports = {
  ProjectRegistry,
  getProjectRegistry
};
