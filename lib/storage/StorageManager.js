// 存储管理器 - 统一存储接口
import { StorageConfig, StorageError } from './StorageInterface.js';
import FileStorage from './FileStorage.js';
import DatabaseStorage from './DatabaseStorage.js';

export class StorageManager {
  constructor() {
    this.storage = null;
    this.config = null;
  }

  // 初始化存储
  async initialize(config = {}) {
    this.config = { ...StorageConfig.DEFAULT_CONFIG, ...config };
    
    // 根据环境变量或配置选择存储类型
    const storageType = this.getStorageType();
    
    try {
      switch (storageType) {
        case StorageConfig.STORAGE_TYPES.DATABASE:
          this.storage = new DatabaseStorage(this.config);
          break;
        case StorageConfig.STORAGE_TYPES.FILE:
          this.storage = new FileStorage(this.config);
          break;
        default:
          throw new StorageError(`不支持的存储类型: ${storageType}`, 'UNSUPPORTED_STORAGE_TYPE');
      }

      // 健康检查
      const health = await this.storage.healthCheck();
      if (health.status !== 'healthy') {
        console.warn(`存储健康检查警告:`, health);
      }

      console.log(`存储系统初始化成功: ${storageType}`);
      return this.storage;
    } catch (error) {
      console.error(`存储系统初始化失败:`, error);
      
      // 如果数据库初始化失败，回退到文件存储
      if (storageType === StorageConfig.STORAGE_TYPES.DATABASE) {
        console.log('回退到文件存储...');
        try {
          this.storage = new FileStorage(this.config);
          const health = await this.storage.healthCheck();
          console.log(`文件存储初始化成功:`, health);
          return this.storage;
        } catch (fallbackError) {
          throw new StorageError(`存储系统初始化完全失败: ${fallbackError.message}`, 'INITIALIZATION_FAILED');
        }
      }
      
      throw error;
    }
  }

  // 获取存储类型
  getStorageType() {
    // 强制在生产环境使用数据库
    if (process.env.NODE_ENV === 'production') {
      console.log('生产环境：强制使用数据库存储');
      return StorageConfig.STORAGE_TYPES.DATABASE;
    }

    // 优先级: 环境变量 > 配置参数 > 默认值
    if (process.env.USE_DATABASE === 'true') {
      return StorageConfig.STORAGE_TYPES.DATABASE;
    }

    if (this.config.type) {
      return this.config.type;
    }

    // 检查是否有数据库环境变量
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return StorageConfig.STORAGE_TYPES.DATABASE;
    }

    return StorageConfig.STORAGE_TYPES.FILE;
  }

  // 获取存储实例
  getStorage() {
    if (!this.storage) {
      throw new StorageError('存储系统未初始化，请先调用 initialize()', 'NOT_INITIALIZED');
    }
    return this.storage;
  }

  // 代理方法 - 分类操作
  async getAllCategories() {
    return await this.getStorage().getAllCategories();
  }

  async getCategoryById(id) {
    return await this.getStorage().getCategoryById(id);
  }

  async createCategory(category) {
    return await this.getStorage().createCategory(category);
  }

  async updateCategory(id, updates) {
    return await this.getStorage().updateCategory(id, updates);
  }

  async deleteCategory(id) {
    return await this.getStorage().deleteCategory(id);
  }

  // 代理方法 - 问题操作
  async getQuestionsByCategory(categoryId) {
    return await this.getStorage().getQuestionsByCategory(categoryId);
  }

  async getQuestionById(id) {
    return await this.getStorage().getQuestionById(id);
  }

  async searchQuestions(query, filters = {}) {
    return await this.getStorage().searchQuestions(query, filters);
  }

  async createQuestion(question) {
    return await this.getStorage().createQuestion(question);
  }

  async updateQuestion(id, updates) {
    return await this.getStorage().updateQuestion(id, updates);
  }

  async deleteQuestion(id) {
    return await this.getStorage().deleteQuestion(id);
  }

  // 代理方法 - 标签操作
  async getAllTags() {
    return await this.getStorage().getAllTags();
  }

  async getQuestionsByTag(tagName) {
    return await this.getStorage().getQuestionsByTag(tagName);
  }

  // 代理方法 - 统计和工具
  async getStatistics() {
    return await this.getStorage().getStatistics();
  }

  async exportData() {
    return await this.getStorage().exportData();
  }

  async importData(data) {
    return await this.getStorage().importData(data);
  }

  async healthCheck() {
    return await this.getStorage().healthCheck();
  }

  // 数据迁移方法
  async migrateFromFileToDatabase() {
    if (this.getStorageType() !== StorageConfig.STORAGE_TYPES.DATABASE) {
      throw new StorageError('当前不是数据库存储模式', 'INVALID_MIGRATION');
    }

    try {
      // 创建文件存储实例读取数据
      const fileStorage = new FileStorage(this.config);
      const fileData = await fileStorage.exportData();
      
      if (!fileData || !fileData.categories || fileData.categories.length === 0) {
        throw new StorageError('没有找到可迁移的文件数据', 'NO_DATA_TO_MIGRATE');
      }

      console.log(`开始迁移 ${fileData.categories.length} 个分类的数据...`);

      // 收集所有标签
      const allTags = new Set();
      fileData.categories.forEach(category => {
        if (category.questions) {
          category.questions.forEach(question => {
            if (question.tags) {
              question.tags.forEach(tag => allTags.add(tag));
            }
          });
        }
      });

      // 创建标签
      console.log(`创建 ${allTags.size} 个标签...`);
      const tagPromises = Array.from(allTags).map(async (tagName) => {
        try {
          await this.storage.createTag({ name: tagName });
        } catch (error) {
          if (!error.message.includes('已存在')) {
            console.warn(`创建标签 ${tagName} 失败:`, error.message);
          }
        }
      });
      await Promise.all(tagPromises);

      // 迁移分类和问题
      let totalQuestions = 0;
      for (const category of fileData.categories) {
        try {
          // 创建分类
          await this.storage.createCategory({
            id: category.id,
            name: category.name,
            description: category.description
          });

          // 创建问题
          if (category.questions) {
            for (const question of category.questions) {
              try {
                await this.storage.createQuestion({
                  id: question.id,
                  categoryId: category.id,
                  title: question.title,
                  content: question.content,
                  difficulty: question.difficulty,
                  tags: question.tags || []
                });
                totalQuestions++;
              } catch (error) {
                console.warn(`创建问题 ${question.id} 失败:`, error.message);
              }
            }
          }

          console.log(`分类 ${category.name} 迁移完成`);
        } catch (error) {
          console.warn(`创建分类 ${category.id} 失败:`, error.message);
        }
      }

      console.log(`数据迁移完成: ${fileData.categories.length} 个分类, ${totalQuestions} 个问题`);
      
      return {
        success: true,
        categoriesCount: fileData.categories.length,
        questionsCount: totalQuestions,
        tagsCount: allTags.size
      };
    } catch (error) {
      console.error('数据迁移失败:', error);
      throw new StorageError(`数据迁移失败: ${error.message}`, 'MIGRATION_FAILED', error);
    }
  }

  // 数据同步方法
  async syncData() {
    try {
      const health = await this.healthCheck();
      if (health.status !== 'healthy') {
        throw new StorageError('存储系统不健康，无法同步数据', 'UNHEALTHY_STORAGE');
      }

      // 清除缓存
      if (this.storage.clearCache) {
        this.storage.clearCache();
      }

      const stats = await this.getStatistics();
      console.log('数据同步完成:', stats);
      
      return stats;
    } catch (error) {
      throw new StorageError(`数据同步失败: ${error.message}`, 'SYNC_FAILED', error);
    }
  }
}

// 全局存储管理器实例
let globalStorageManager = null;

export async function getStorageManager(config = {}) {
  if (!globalStorageManager) {
    globalStorageManager = new StorageManager();
    await globalStorageManager.initialize(config);
  }
  return globalStorageManager;
}

// 便捷方法
export async function getStorage(config = {}) {
  const manager = await getStorageManager(config);
  return manager.getStorage();
}

export default StorageManager;
