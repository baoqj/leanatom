// 文件存储实现
import fs from 'fs/promises';
import path from 'path';
import { StorageInterface, DataValidator, StorageConfig, StorageError } from './StorageInterface.js';

export class FileStorage extends StorageInterface {
  constructor(config = {}) {
    super();
    this.config = { ...StorageConfig.DEFAULT_CONFIG, ...config };
    this.dataPath = this.config.dataPath;
    this.cache = new Map();
    this.cacheTimeout = this.config.cacheTimeout;
  }

  // 获取数据文件路径
  getDataFilePath() {
    return path.join(this.dataPath, 'questionBankData.json');
  }

  // 读取数据文件
  async readDataFile() {
    const cacheKey = 'questionBankData';
    
    // 检查缓存
    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const filePath = this.getDataFilePath();
      const fileContent = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContent);

      // 更新缓存
      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }

      return data;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 文件不存在，返回空数据结构
        return { categories: [] };
      }
      throw new StorageError(`读取数据文件失败: ${error.message}`, 'FILE_READ_ERROR', error);
    }
  }

  // 写入数据文件
  async writeDataFile(data) {
    try {
      const filePath = this.getDataFilePath();
      
      // 确保目录存在
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // 写入文件
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      
      // 清除缓存
      this.cache.clear();
      
      return true;
    } catch (error) {
      throw new StorageError(`写入数据文件失败: ${error.message}`, 'FILE_WRITE_ERROR', error);
    }
  }

  // 分类相关操作
  async getAllCategories() {
    const data = await this.readDataFile();
    return data.categories || [];
  }

  async getCategoryById(id) {
    const categories = await this.getAllCategories();
    return categories.find(cat => cat.id === id) || null;
  }

  async createCategory(category) {
    // 验证数据
    const validation = DataValidator.validate(category, StorageConfig.VALIDATION_RULES.category);
    if (!validation.isValid) {
      throw new StorageError(`分类数据验证失败: ${validation.errors.join(', ')}`, 'VALIDATION_ERROR');
    }

    const data = await this.readDataFile();
    
    // 检查ID是否已存在
    if (data.categories.some(cat => cat.id === category.id)) {
      throw new StorageError(`分类ID ${category.id} 已存在`, 'DUPLICATE_ID');
    }

    // 添加时间戳
    const newCategory = {
      ...category,
      questions: category.questions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.categories.push(newCategory);
    await this.writeDataFile(data);
    
    return newCategory;
  }

  async updateCategory(id, updates) {
    const data = await this.readDataFile();
    const categoryIndex = data.categories.findIndex(cat => cat.id === id);
    
    if (categoryIndex === -1) {
      throw new StorageError(`分类 ${id} 不存在`, 'CATEGORY_NOT_FOUND');
    }

    // 验证更新数据
    const updatedCategory = { ...data.categories[categoryIndex], ...updates };
    const validation = DataValidator.validate(updatedCategory, StorageConfig.VALIDATION_RULES.category);
    if (!validation.isValid) {
      throw new StorageError(`分类数据验证失败: ${validation.errors.join(', ')}`, 'VALIDATION_ERROR');
    }

    // 更新分类
    data.categories[categoryIndex] = {
      ...updatedCategory,
      updatedAt: new Date().toISOString()
    };

    await this.writeDataFile(data);
    return data.categories[categoryIndex];
  }

  async deleteCategory(id) {
    const data = await this.readDataFile();
    const categoryIndex = data.categories.findIndex(cat => cat.id === id);
    
    if (categoryIndex === -1) {
      throw new StorageError(`分类 ${id} 不存在`, 'CATEGORY_NOT_FOUND');
    }

    const deletedCategory = data.categories.splice(categoryIndex, 1)[0];
    await this.writeDataFile(data);
    
    return deletedCategory;
  }

  // 问题相关操作
  async getQuestionsByCategory(categoryId) {
    const category = await this.getCategoryById(categoryId);
    return category ? category.questions || [] : [];
  }

  async getQuestionById(id) {
    const categories = await this.getAllCategories();
    
    for (const category of categories) {
      const question = category.questions?.find(q => q.id === id);
      if (question) {
        return { ...question, categoryId: category.id };
      }
    }
    
    return null;
  }

  async searchQuestions(query, filters = {}) {
    const categories = await this.getAllCategories();
    let allQuestions = [];

    // 收集所有问题
    categories.forEach(category => {
      if (category.questions) {
        category.questions.forEach(question => {
          allQuestions.push({
            ...question,
            categoryId: category.id,
            categoryName: category.name
          });
        });
      }
    });

    // 应用搜索和过滤
    let results = allQuestions;

    // 文本搜索
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase();
      results = results.filter(question => 
        question.title.toLowerCase().includes(searchTerm) ||
        question.content.toLowerCase().includes(searchTerm) ||
        (question.tags && question.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
    }

    // 分类过滤
    if (filters.categoryId) {
      results = results.filter(question => question.categoryId === filters.categoryId);
    }

    // 难度过滤
    if (filters.difficulty) {
      results = results.filter(question => question.difficulty === filters.difficulty);
    }

    // 标签过滤
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(question => 
        question.tags && filters.tags.some(tag => question.tags.includes(tag))
      );
    }

    return results;
  }

  // 标签相关操作
  async getAllTags() {
    const categories = await this.getAllCategories();
    const tagSet = new Set();

    categories.forEach(category => {
      if (category.questions) {
        category.questions.forEach(question => {
          if (question.tags) {
            question.tags.forEach(tag => tagSet.add(tag));
          }
        });
      }
    });

    return Array.from(tagSet).sort();
  }

  async getQuestionsByTag(tagName) {
    return await this.searchQuestions('', { tags: [tagName] });
  }

  // 统计信息
  async getStatistics() {
    const categories = await this.getAllCategories();
    const tags = await this.getAllTags();
    
    let totalQuestions = 0;
    const difficultyCount = { easy: 0, medium: 0, hard: 0 };

    categories.forEach(category => {
      if (category.questions) {
        totalQuestions += category.questions.length;
        category.questions.forEach(question => {
          if (question.difficulty) {
            difficultyCount[question.difficulty]++;
          }
        });
      }
    });

    return {
      totalCategories: categories.length,
      totalQuestions,
      totalTags: tags.length,
      difficultyDistribution: difficultyCount,
      lastUpdated: new Date().toISOString()
    };
  }

  // 数据导入导出
  async exportData() {
    return await this.readDataFile();
  }

  async importData(data) {
    // 验证导入数据结构
    if (!data || !Array.isArray(data.categories)) {
      throw new StorageError('导入数据格式无效', 'INVALID_IMPORT_DATA');
    }

    await this.writeDataFile(data);
    return true;
  }

  // 健康检查
  async healthCheck() {
    try {
      const data = await this.readDataFile();
      const stats = await this.getStatistics();
      
      return {
        status: 'healthy',
        storage: 'file',
        dataPath: this.dataPath,
        cacheEnabled: this.config.cacheEnabled,
        ...stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        storage: 'file',
        error: error.message
      };
    }
  }
}

export default FileStorage;
