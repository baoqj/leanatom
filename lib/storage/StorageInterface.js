// 存储接口抽象层
// 支持多种存储后端：文件、数据库、云存储等

export class StorageInterface {
  constructor() {
    if (this.constructor === StorageInterface) {
      throw new Error('StorageInterface 是抽象类，不能直接实例化');
    }
  }

  // 分类相关操作
  async getAllCategories() {
    throw new Error('getAllCategories 方法必须被实现');
  }

  async getCategoryById(id) {
    throw new Error('getCategoryById 方法必须被实现');
  }

  async createCategory(category) {
    throw new Error('createCategory 方法必须被实现');
  }

  async updateCategory(id, updates) {
    throw new Error('updateCategory 方法必须被实现');
  }

  async deleteCategory(id) {
    throw new Error('deleteCategory 方法必须被实现');
  }

  // 问题相关操作
  async getQuestionsByCategory(categoryId) {
    throw new Error('getQuestionsByCategory 方法必须被实现');
  }

  async getQuestionById(id) {
    throw new Error('getQuestionById 方法必须被实现');
  }

  async searchQuestions(query, filters = {}) {
    throw new Error('searchQuestions 方法必须被实现');
  }

  async createQuestion(question) {
    throw new Error('createQuestion 方法必须被实现');
  }

  async updateQuestion(id, updates) {
    throw new Error('updateQuestion 方法必须被实现');
  }

  async deleteQuestion(id) {
    throw new Error('deleteQuestion 方法必须被实现');
  }

  // 标签相关操作
  async getAllTags() {
    throw new Error('getAllTags 方法必须被实现');
  }

  async getQuestionsByTag(tagName) {
    throw new Error('getQuestionsByTag 方法必须被实现');
  }

  async createTag(tag) {
    throw new Error('createTag 方法必须被实现');
  }

  async deleteTag(tagName) {
    throw new Error('deleteTag 方法必须被实现');
  }

  // 统计相关操作
  async getStatistics() {
    throw new Error('getStatistics 方法必须被实现');
  }

  // 数据导入导出
  async exportData() {
    throw new Error('exportData 方法必须被实现');
  }

  async importData(data) {
    throw new Error('importData 方法必须被实现');
  }

  // 健康检查
  async healthCheck() {
    throw new Error('healthCheck 方法必须被实现');
  }
}

// 存储配置
export const StorageConfig = {
  // 存储类型
  STORAGE_TYPES: {
    FILE: 'file',
    DATABASE: 'database',
    MEMORY: 'memory'
  },

  // 默认配置
  DEFAULT_CONFIG: {
    type: 'file',
    dataPath: './data',
    cacheEnabled: true,
    cacheTimeout: 300000, // 5分钟
  },

  // 数据验证规则
  VALIDATION_RULES: {
    category: {
      id: { required: true, type: 'string', maxLength: 50 },
      name: { required: true, type: 'string', maxLength: 100 },
      description: { required: false, type: 'string', maxLength: 500 }
    },
    question: {
      id: { required: true, type: 'string', maxLength: 50 },
      categoryId: { required: true, type: 'string', maxLength: 50 },
      title: { required: true, type: 'string', maxLength: 200 },
      content: { required: true, type: 'string', maxLength: 5000 },
      tags: { required: false, type: 'array' },
      difficulty: { required: false, type: 'string', enum: ['easy', 'medium', 'hard'] }
    },
    tag: {
      name: { required: true, type: 'string', maxLength: 50 }
    }
  }
};

// 数据验证工具
export class DataValidator {
  static validate(data, rules) {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];

      // 检查必填字段
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`字段 ${field} 是必填的`);
        continue;
      }

      // 如果字段为空且非必填，跳过其他验证
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // 类型检查
      if (rule.type && typeof value !== rule.type) {
        if (rule.type === 'array' && !Array.isArray(value)) {
          errors.push(`字段 ${field} 必须是数组类型`);
        } else if (rule.type !== 'array' && typeof value !== rule.type) {
          errors.push(`字段 ${field} 必须是 ${rule.type} 类型`);
        }
      }

      // 长度检查
      if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
        errors.push(`字段 ${field} 长度不能超过 ${rule.maxLength} 个字符`);
      }

      // 枚举值检查
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`字段 ${field} 必须是以下值之一: ${rule.enum.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 问题数据验证
  static validateQuestion(questionData, isUpdate = false) {
    const rules = {
      id: { required: isUpdate, type: 'string', maxLength: 100 },
      title: { required: true, type: 'string', maxLength: 200 },
      content: { required: true, type: 'string', maxLength: 5000 },
      categoryId: { required: true, type: 'string', maxLength: 100 },
      difficulty: { required: false, type: 'string', enum: ['easy', 'medium', 'hard'] },
      tags: { required: false, type: 'array' }
    };

    const result = this.validate(questionData, rules);
    return result.isValid;
  }

  // 分类数据验证
  static validateCategory(categoryData, isUpdate = false) {
    const rules = {
      id: { required: isUpdate, type: 'string', maxLength: 100 },
      name: { required: true, type: 'string', maxLength: 100 },
      description: { required: false, type: 'string', maxLength: 500 }
    };

    const result = this.validate(categoryData, rules);
    return result.isValid;
  }
}

// 存储错误类
export class StorageError extends Error {
  constructor(message, code = 'STORAGE_ERROR', details = null) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.details = details;
  }
}

export default StorageInterface;
