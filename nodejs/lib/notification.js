/**
 * 通知系统 (Notification System)
 * 支持任务进度通知、构建通知、代码变更通知
 */

class NotificationSystem {
  constructor() {
    this.channels = new Map();
    this.history = [];
  }

  /**
   * 注册通知渠道
   * @param {string} name - 渠道名称 (wechat/feishu/webhook)
   * @param {Object} config - 渠道配置
   */
  registerChannel(name, config) {
    this.channels.set(name, {
      name,
      config,
      enabled: true
    });
  }

  /**
   * 移除通知渠道
   * @param {string} name - 渠道名称
   */
  removeChannel(name) {
    this.channels.delete(name);
  }

  /**
   * 发送通知
   * @param {Object} notification - 通知内容
   */
  async send(notification) {
    const { type, title, message, data, channels } = notification;

    const notificationRecord = {
      id: 'notif_' + Date.now(),
      type,
      title,
      message,
      data,
      timestamp: new Date().toISOString(),
      results: []
    };

    // 确定要发送的渠道
    const targetChannels = channels || Array.from(this.channels.keys());

    for (const channelName of targetChannels) {
      const channel = this.channels.get(channelName);
      if (!channel || !channel.enabled) {
        continue;
      }

      try {
        const result = await this.sendToChannel(channel, notification);
        notificationRecord.results.push({
          channel: channelName,
          success: true,
          result
        });
      } catch (error) {
        notificationRecord.results.push({
          channel: channelName,
          success: false,
          error: error.message
        });
      }
    }

    this.history.push(notificationRecord);
    return notificationRecord;
  }

  /**
   * 发送到具体渠道
   */
  async sendToChannel(channel, notification) {
    const { name, config } = channel;

    switch (name) {
      case 'wechat':
        return await this.sendToWechat(config, notification);
      case 'feishu':
        return await this.sendToFeishu(config, notification);
      case 'webhook':
        return await this.sendToWebhook(config, notification);
      case 'console':
        return this.sendToConsole(notification);
      default:
        throw new Error('未知的通知渠道: ' + name);
    }
  }

  /**
   * 发送到微信（企业微信机器人）
   */
  async sendToWechat(config, notification) {
    const { webhook_url } = config;
    
    if (!webhook_url) {
      throw new Error('微信机器人 webhook_url 未配置');
    }

    const axios = require('axios');
    
    const content = this.formatMessage(notification);
    
    await axios.post(webhook_url, {
      msgtype: 'markdown',
      markdown: {
        content
      }
    });

    return { sent: true };
  }

  /**
   * 发送到飞书
   */
  async sendToFeishu(config, notification) {
    const { webhook_url } = config;
    
    if (!webhook_url) {
      throw new Error('飞书机器人 webhook_url 未配置');
    }

    const axios = require('axios');
    
    const content = this.formatMessage(notification);
    
    await axios.post(webhook_url, {
      msg_type: 'text',
      content: {
        text: content
      }
    });

    return { sent: true };
  }

  /**
   * 发送到自定义 Webhook
   */
  async sendToWebhook(config, notification) {
    const { url, method = 'POST', headers = {} } = config;
    
    if (!url) {
      throw new Error('Webhook URL 未配置');
    }

    const axios = require('axios');
    
    await axios({
      method,
      url,
      headers,
      data: notification
    });

    return { sent: true };
  }

  /**
   * 发送到控制台
   */
  sendToConsole(notification) {
    const { type, title, message } = notification;
    const time = new Date().toLocaleString('zh-CN');
    
    console.log('[' + time + '] [' + type + '] ' + title + ': ' + message);
    
    return { sent: true };
  }

  /**
   * 格式化消息
   */
  formatMessage(notification) {
    const { type, title, message, data } = notification;
    
    let content = '## ' + title + '\n\n';
    content += message + '\n\n';
    
    if (data) {
      if (data.progress !== undefined) {
        content += '**进度**: ' + data.progress + '%\n';
      }
      if (data.current_step) {
        content += '**当前步骤**: ' + data.current_step + '\n';
      }
      if (data.project_id) {
        content += '**项目**: ' + data.project_id + '\n';
      }
      if (data.task_id) {
        content += '**任务ID**: ' + data.task_id + '\n';
      }
    }
    
    return content;
  }

  /**
   * 发送任务进度通知
   */
  async notifyProgress(task_id, progress, current_step, data = {}) {
    return await this.send({
      type: 'progress',
      title: '任务进度更新',
      message: '[' + progress + '%] ' + current_step,
      data: {
        task_id,
        progress,
        current_step,
        ...data
      }
    });
  }

  /**
   * 发送构建通知
   */
  async notifyBuild(task_id, status, data = {}) {
    const title = status === 'success' ? '构建成功' : '构建失败';
    const message = status === 'success' 
      ? '项目构建完成，可以开始部署' 
      : '项目构建失败，请检查日志';
    
    return await this.send({
      type: 'build',
      title,
      message,
      data: {
        task_id,
        status,
        ...data
      }
    });
  }

  /**
   * 发送部署通知
   */
  async notifyDeploy(task_id, status, env, data = {}) {
    const title = status === 'success' ? '部署成功' : '部署失败';
    const message = status === 'success'
      ? '项目已成功部署到 ' + env + ' 环境'
      : '部署到 ' + env + ' 环境失败';
    
    return await this.send({
      type: 'deploy',
      title,
      message,
      data: {
        task_id,
        status,
        env,
        ...data
      }
    });
  }

  /**
   * 发送代码变更通知
   */
  async notifyCodeChange(task_id, changes, data = {}) {
    return await this.send({
      type: 'code_change',
      title: '代码变更',
      message: 'AI 生成了 ' + changes.length + ' 个文件变更',
      data: {
        task_id,
        changes,
        ...data
      }
    });
  }

  /**
   * 获取通知历史
   */
  getHistory(limit = 50) {
    return this.history.slice(-limit);
  }
}

let instance = null;

function getNotificationSystem() {
  if (!instance) {
    instance = new NotificationSystem();
    // 默认注册控制台渠道
    instance.registerChannel('console', {});
  }
  return instance;
}

module.exports = {
  NotificationSystem,
  getNotificationSystem
};
