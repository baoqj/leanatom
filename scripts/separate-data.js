#!/usr/bin/env node

// 数据分离脚本 - 将 questionBank.js 中的代码和数据分离
const fs = require('fs/promises');
const path = require('path');

async function separateData() {
  console.log('🔄 开始分离 questionBank.js 中的代码和数据...\n');

  try {
    // 读取原始文件
    const questionBankPath = path.join(process.cwd(), 'data', 'questionBank.js');
    const questionBankContent = await fs.readFile(questionBankPath, 'utf8');

    // 提取数据部分 (使用正则表达式或简单的字符串处理)
    const dataMatch = questionBankContent.match(/export const initialQuestionBank = ({[\s\S]*?});/);
    
    if (!dataMatch) {
      throw new Error('无法在 questionBank.js 中找到 initialQuestionBank 数据');
    }

    const dataString = dataMatch[1];
    
    // 将字符串转换为 JSON (需要处理 JavaScript 对象格式)
    const dataObject = eval(`(${dataString})`);
    
    // 验证数据结构
    if (!dataObject.categories || !Array.isArray(dataObject.categories)) {
      throw new Error('数据结构无效：缺少 categories 数组');
    }

    console.log(`✅ 成功提取数据: ${dataObject.categories.length} 个分类`);

    // 1. 创建纯数据文件 (JSON)
    const pureDataPath = path.join(process.cwd(), 'data', 'questionBankData.json');
    await fs.writeFile(pureDataPath, JSON.stringify(dataObject, null, 2), 'utf8');
    console.log(`✅ 创建纯数据文件: ${pureDataPath}`);

    // 2. 创建数据操作类 (纯代码)
    const codeOnlyContent = `// 问题库数据操作类 - 纯代码，不包含数据
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
`;

    const codeOnlyPath = path.join(process.cwd(), 'data', 'questionBankCode.js');
    await fs.writeFile(codeOnlyPath, codeOnlyContent, 'utf8');
    console.log(`✅ 创建纯代码文件: ${codeOnlyPath}`);

    // 3. 备份原始文件
    const backupPath = path.join(process.cwd(), 'data', 'questionBank.js.backup');
    await fs.copyFile(questionBankPath, backupPath);
    console.log(`✅ 备份原始文件: ${backupPath}`);

    // 4. 创建新的 questionBank.js (只导入数据)
    const newQuestionBankContent = `// 问题库入口文件 - 使用分离的数据和代码
import { QuestionBankData } from './questionBankCode.js';

// 创建默认实例
export const questionBankData = new QuestionBankData();

// 向后兼容的导出
export const initialQuestionBank = {
  async getCategories() {
    const data = await questionBankData.loadData();
    return data.categories || [];
  }
};

// 导出数据操作类
export { QuestionBankData } from './questionBankCode.js';

export default questionBankData;
`;

    await fs.writeFile(questionBankPath, newQuestionBankContent, 'utf8');
    console.log(`✅ 更新 questionBank.js 为模块化版本`);

    // 5. 统计信息
    console.log('\n📊 分离结果统计:');
    console.log(`- 分类数量: ${dataObject.categories.length}`);
    
    let totalQuestions = 0;
    dataObject.categories.forEach(category => {
      if (category.questions) {
        totalQuestions += category.questions.length;
      }
    });
    console.log(`- 问题数量: ${totalQuestions}`);

    const allTags = new Set();
    dataObject.categories.forEach(category => {
      if (category.questions) {
        category.questions.forEach(question => {
          if (question.tags) {
            question.tags.forEach(tag => allTags.add(tag));
          }
        });
      }
    });
    console.log(`- 标签数量: ${allTags.size}`);

    console.log('\n🎉 数据分离完成！');
    console.log('\n📁 生成的文件:');
    console.log(`- ${pureDataPath} (纯数据)`);
    console.log(`- ${codeOnlyPath} (纯代码)`);
    console.log(`- ${questionBankPath} (模块化入口)`);
    console.log(`- ${backupPath} (原始备份)`);

    return {
      success: true,
      categoriesCount: dataObject.categories.length,
      questionsCount: totalQuestions,
      tagsCount: allTags.size,
      files: {
        data: pureDataPath,
        code: codeOnlyPath,
        entry: questionBankPath,
        backup: backupPath
      }
    };

  } catch (error) {
    console.error('❌ 数据分离失败:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  separateData()
    .then(result => {
      console.log('\n✅ 脚本执行成功');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { separateData };
