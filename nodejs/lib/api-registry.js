/**
 * API Registry
 * 管理API接口规则，支持OpenAPI格式
 */

const fs = require('fs');
const path = require('path');

const API_REGISTRY_FILE = path.join(__dirname, '../../data/api-registry.json');

class ApiRegistry {
  constructor() {
    this.apis = this.load();
  }

  load() {
    try {
      const data = fs.readFileSync(API_REGISTRY_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  save() {
    fs.writeFileSync(API_REGISTRY_FILE, JSON.stringify(this.apis, null, 2));
  }

  registerApi(apiSpec) {
    const { service_name, version, openapi_spec, project_id } = apiSpec;

    if (!service_name || !openapi_spec) {
      throw new Error('service_name 和 openapi_spec 为必填项');
    }

    const api = {
      api_id: 'api_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      service_name,
      version: version || '1.0.0',
      project_id: project_id || null,
      openapi_spec,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const existingIndex = this.apis.findIndex(
      a => a.service_name === service_name && a.version === version
    );

    if (existingIndex > -1) {
      this.apis[existingIndex] = {
        ...this.apis[existingIndex],
        ...api,
        api_id: this.apis[existingIndex].api_id
      };
    } else {
      this.apis.push(api);
    }

    this.save();
    return api;
  }

  getApi(service_name, version = null) {
    if (version) {
      return this.apis.find(
        a => a.service_name === service_name && a.version === version
      ) || null;
    }

    const apis = this.apis.filter(a => a.service_name === service_name);
    if (apis.length === 0) return null;

    return apis.sort((a, b) => 
      new Date(b.updated_at) - new Date(a.updated_at)
    )[0];
  }

  getAllApis(project_id = null) {
    if (project_id) {
      return this.apis.filter(a => a.project_id === project_id);
    }
    return this.apis;
  }

  deleteApi(service_name, version = null) {
    const before = this.apis.length;

    if (version) {
      this.apis = this.apis.filter(
        a => !(a.service_name === service_name && a.version === version)
      );
    } else {
      this.apis = this.apis.filter(a => a.service_name !== service_name);
    }

    this.save();
    return this.apis.length < before;
  }

  extractEndpoints(openapi_spec) {
    const endpoints = [];

    if (!openapi_spec.paths) {
      return endpoints;
    }

    Object.keys(openapi_spec.paths).forEach(p => {
      const methods = openapi_spec.paths[p];
      Object.keys(methods).forEach(method => {
        const operation = methods[method];
        endpoints.push({
          path: p,
          method: method.toUpperCase(),
          operationId: operation.operationId || null,
          summary: operation.summary || '',
          parameters: operation.parameters || [],
          requestBody: operation.requestBody || null,
          responses: operation.responses || {}
        });
      });
    });

    return endpoints;
  }

  generateClientCode(service_name, language = 'javascript') {
    const api = this.getApi(service_name);
    if (!api) {
      throw new Error('服务不存在: ' + service_name);
    }

    const endpoints = this.extractEndpoints(api.openapi_spec);
    const baseUrl = api.openapi_spec.servers?.[0]?.url || 'http://localhost:3000';

    return this.generateJsClient(service_name, baseUrl, endpoints);
  }

  generateJsClient(serviceName, baseUrl, endpoints) {
    let code = '/** ' + serviceName + ' API Client */\n\n';
    code += 'const axios = require(\'axios\');\n\n';
    code += 'class Client {\n';
    code += '  constructor(baseUrl = \'' + baseUrl + '\') {\n';
    code += '    this.baseUrl = baseUrl;\n';
    code += '  }\n\n';

    endpoints.forEach(ep => {
      const methodName = (ep.operationId || ep.method.toLowerCase() + ep.path.replace(/[{}\/]/g, '_')).replace(/_+/g, '_');
      code += '  async ' + methodName + '(data) {\n';
      code += '    return axios({ method: \'' + ep.method.toLowerCase() + '\', url: this.baseUrl + \'' + ep.path + '\'';
      if (['GET', 'DELETE'].includes(ep.method)) {
        code += ', params: data';
      } else {
        code += ', data';
      }
      code += ' });\n  }\n\n';
    });

    code += '}\n\nmodule.exports = { Client };\n';
    return code;
  }

  toPascalCase(str) {
    return str.replace(/(^|_|-)(\w)/g, (m, p1, p2) => p2.toUpperCase());
  }

  toCamelCase(str) {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }
}

let instance = null;

function getApiRegistry() {
  if (!instance) {
    instance = new ApiRegistry();
  }
  return instance;
}

module.exports = {
  ApiRegistry,
  getApiRegistry
};
