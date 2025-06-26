// 问题库数据操作类 - 纯代码，不包含数据
import fs from 'fs/promises';
import path from 'path';

export class QuestionBankData {
  constructor(dataPath = null) {
    this.dataPath = dataPath || path.join(process.cwd(), 'data', 'questionBankData.json');
    this.cache = null;
    this.cacheTime = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  // 读取数据文件
  async loadData() {
    try {
      // 检查缓存
      if (this.cache && this.cacheTime && (Date.now() - this.cacheTime < this.cacheTimeout)) {
        return this.cache;
      }

      const content = await fs.readFile(this.dataPath, 'utf8');
      const data = JSON.parse(content);
      
      // 更新缓存
      this.cache = data;
      this.cacheTime = Date.now();
      
      return data;
    } catch (error) {
      console.error('读取问题库数据失败:', error);
      return { categories: [] };
    }
  }

  // 保存数据文件
  async saveData(data) {
    try {
      await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2), 'utf8');
      
      // 清除缓存
      this.cache = null;
      this.cacheTime = null;
      
      return true;
    } catch (error) {
      console.error('保存问题库数据失败:', error);
      return false;
    }
  }

  // 获取所有分类
  async getAllCategories() {
    const data = await this.loadData();
    return data.categories || [];
  }

  // 根据ID获取分类
  async getCategoryById(id) {
    const categories = await this.getAllCategories();
    return categories.find(cat => cat.id === id) || null;
  }

  // 获取分类下的问题
  async getQuestionsByCategory(categoryId) {
    const category = await this.getCategoryById(categoryId);
    return category ? category.questions || [] : [];
  }

  // 搜索问题
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

    if (query && query.trim()) {
      const searchTerm = query.toLowerCase();
      results = results.filter(question => 
        question.title.toLowerCase().includes(searchTerm) ||
        question.content.toLowerCase().includes(searchTerm) ||
        (question.tags && question.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
    }

    if (filters.categoryId) {
      results = results.filter(question => question.categoryId === filters.categoryId);
    }

    if (filters.difficulty) {
      results = results.filter(question => question.difficulty === filters.difficulty);
    }

    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(question => 
        question.tags && filters.tags.some(tag => question.tags.includes(tag))
      );
    }

    return results;
  }

  // 获取所有标签
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

  // 获取统计信息
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
      difficultyDistribution: difficultyCount
    };
  }

  // 清除缓存
  clearCache() {
    this.cache = null;
    this.cacheTime = null;
  }
}

// 默认实例
export const questionBankData = new QuestionBankData();

// 向后兼容的导出
export const initialQuestionBank = {
  async getCategories() {
    return await questionBankData.getAllCategories();
  }
};

export default QuestionBankData;
