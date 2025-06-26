// 数据库存储实现 (Supabase)
import { createClient } from '@supabase/supabase-js';
import { StorageInterface, DataValidator, StorageConfig, StorageError } from './StorageInterface.js';

export class DatabaseStorage extends StorageInterface {
  constructor(config = {}) {
    super();
    this.config = { ...StorageConfig.DEFAULT_CONFIG, ...config };
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new StorageError('缺少 Supabase 环境变量配置', 'MISSING_CONFIG');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    this.cache = new Map();
    this.cacheTimeout = this.config.cacheTimeout;
  }

  // 生成ID的辅助方法
  generateId(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // 移除特殊字符
      .replace(/\s+/g, '-') // 空格替换为连字符
      .replace(/-+/g, '-') // 多个连字符合并为一个
      .replace(/^-|-$/g, '') // 移除开头和结尾的连字符
      .substring(0, 50) + '-' + Date.now().toString(36); // 添加时间戳确保唯一性
  }

  // 缓存辅助方法
  getCacheKey(operation, params = '') {
    return `${operation}_${params}`;
  }

  setCache(key, data) {
    if (this.config.cacheEnabled) {
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });
    }
  }

  getCache(key) {
    if (!this.config.cacheEnabled || !this.cache.has(key)) {
      return null;
    }
    
    const cached = this.cache.get(key);
    if (Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    this.cache.delete(key);
    return null;
  }

  clearCache() {
    this.cache.clear();
  }

  // 分类相关操作
  async getAllCategories() {
    const cacheKey = this.getCacheKey('categories_with_counts');
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      // 获取分类和对应的问题数量
      const { data: categories, error } = await this.supabase
        .from('question_categories')
        .select(`
          *,
          questions (
            id,
            title,
            content,
            difficulty,
            created_at,
            question_tags (
              tags (name)
            )
          )
        `)
        .order('created_at');

      if (error) {
        throw new StorageError(`获取分类失败: ${error.message}`, 'DATABASE_ERROR', error);
      }

      // 处理数据，包含问题数量和完整问题信息
      const processedCategories = (categories || []).map(category => ({
        ...category,
        questionCount: category.questions?.length || 0,
        questions: (category.questions || []).map(question => ({
          ...question,
          tags: question.question_tags?.map(qt => qt.tags.name) || []
        }))
      }));

      this.setCache(cacheKey, processedCategories);
      return processedCategories;
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`数据库操作失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  async getCategoryById(id) {
    const cacheKey = this.getCacheKey('category', id);
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const { data: category, error } = await this.supabase
        .from('question_categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new StorageError(`获取分类失败: ${error.message}`, 'DATABASE_ERROR', error);
      }

      const result = category || null;
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`数据库操作失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  async createCategory(category) {
    // 简化验证逻辑，只检查必要字段
    if (!category.name || typeof category.name !== 'string' || category.name.trim() === '') {
      throw new StorageError('分类名称是必填的', 'VALIDATION_ERROR');
    }

    if (category.name.length > 100) {
      throw new StorageError('分类名称不能超过100个字符', 'VALIDATION_ERROR');
    }

    // 生成分类ID
    const categoryId = this.generateId(category.name);

    try {
      const { data: newCategory, error } = await this.supabase
        .from('question_categories')
        .insert([{
          id: categoryId,
          name: category.name,
          description: category.description || null
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new StorageError(`分类ID ${category.id} 已存在`, 'DUPLICATE_ID');
        }
        throw new StorageError(`创建分类失败: ${error.message}`, 'DATABASE_ERROR', error);
      }

      this.clearCache(); // 清除相关缓存
      return newCategory;
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`数据库操作失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  async updateCategory(id, updates) {
    // 验证数据（更新时需要ID）
    if (!DataValidator.validateCategory({ id, ...updates }, true)) {
      throw new StorageError('分类数据验证失败', 'VALIDATION_ERROR');
    }

    try {
      const { data: updatedCategory, error } = await this.supabase
        .from('question_categories')
        .update({
          name: updates.name,
          description: updates.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new StorageError(`分类 ${id} 不存在`, 'CATEGORY_NOT_FOUND');
        }
        throw new StorageError(`更新分类失败: ${error.message}`, 'DATABASE_ERROR', error);
      }

      this.clearCache();
      return updatedCategory;
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`数据库操作失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  async deleteCategory(id) {
    try {
      // 首先检查分类是否包含问题
      const { data: questions, error: questionsError } = await this.supabase
        .from('questions')
        .select('id')
        .eq('category_id', id);

      if (questionsError) {
        throw new StorageError(`检查分类问题失败: ${questionsError.message}`, 'DATABASE_ERROR', questionsError);
      }

      if (questions && questions.length > 0) {
        throw new StorageError(`无法删除分类，该分类包含 ${questions.length} 个问题，请先删除所有问题`, 'CATEGORY_HAS_QUESTIONS');
      }

      // 删除分类
      const { data: deletedCategory, error } = await this.supabase
        .from('question_categories')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new StorageError(`分类 ${id} 不存在`, 'CATEGORY_NOT_FOUND');
        }
        throw new StorageError(`删除分类失败: ${error.message}`, 'DATABASE_ERROR', error);
      }

      this.clearCache();
      return deletedCategory;
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`数据库操作失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  // 问题相关操作
  async getQuestionsByCategory(categoryId) {
    const cacheKey = this.getCacheKey('questions_by_category', categoryId);
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const { data: questions, error } = await this.supabase
        .from('questions')
        .select(`
          *,
          question_tags (
            tags (name)
          )
        `)
        .eq('category_id', categoryId)
        .order('created_at');

      if (error) {
        throw new StorageError(`获取问题失败: ${error.message}`, 'DATABASE_ERROR', error);
      }

      // 处理标签数据
      const processedQuestions = (questions || []).map(question => ({
        ...question,
        tags: question.question_tags?.map(qt => qt.tags.name) || []
      }));

      this.setCache(cacheKey, processedQuestions);
      return processedQuestions;
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`数据库操作失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  async getQuestionById(id) {
    const cacheKey = this.getCacheKey('question', id);
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const { data: question, error } = await this.supabase
        .from('questions')
        .select(`
          *,
          question_tags (
            tags (name)
          ),
          question_categories (name)
        `)
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new StorageError(`获取问题失败: ${error.message}`, 'DATABASE_ERROR', error);
      }

      if (!question) return null;

      // 处理数据
      const processedQuestion = {
        ...question,
        tags: question.question_tags?.map(qt => qt.tags.name) || [],
        categoryName: question.question_categories?.name
      };

      this.setCache(cacheKey, processedQuestion);
      return processedQuestion;
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`数据库操作失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  async searchQuestions(query, filters = {}) {
    try {
      let queryBuilder = this.supabase
        .from('questions')
        .select(`
          *,
          question_tags (
            tags (name)
          ),
          question_categories (name)
        `);

      // 文本搜索
      if (query && query.trim()) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,content.ilike.%${query}%`);
      }

      // 分类过滤
      if (filters.categoryId) {
        queryBuilder = queryBuilder.eq('category_id', filters.categoryId);
      }

      // 难度过滤
      if (filters.difficulty) {
        queryBuilder = queryBuilder.eq('difficulty', filters.difficulty);
      }

      const { data: questions, error } = await queryBuilder.order('created_at', { ascending: false });

      if (error) {
        throw new StorageError(`搜索问题失败: ${error.message}`, 'DATABASE_ERROR', error);
      }

      // 处理数据
      let results = (questions || []).map(question => ({
        ...question,
        tags: question.question_tags?.map(qt => qt.tags.name) || [],
        categoryName: question.question_categories?.name
      }));

      // 标签过滤 (在应用层处理，因为数据库查询较复杂)
      if (filters.tags && filters.tags.length > 0) {
        results = results.filter(question => 
          question.tags && filters.tags.some(tag => question.tags.includes(tag))
        );
      }

      return results;
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`数据库操作失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  // 标签相关操作
  async getAllTags() {
    const cacheKey = this.getCacheKey('tags');
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const { data: tags, error } = await this.supabase
        .from('tags')
        .select('name')
        .order('name');

      if (error) {
        throw new StorageError(`获取标签失败: ${error.message}`, 'DATABASE_ERROR', error);
      }

      const tagNames = (tags || []).map(tag => tag.name);
      this.setCache(cacheKey, tagNames);
      return tagNames;
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`数据库操作失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  async getQuestionsByTag(tagName) {
    try {
      const { data: questions, error } = await this.supabase
        .from('questions')
        .select(`
          *,
          question_tags!inner (
            tags!inner (name)
          ),
          question_categories (name)
        `)
        .eq('question_tags.tags.name', tagName)
        .order('created_at');

      if (error) {
        throw new StorageError(`按标签获取问题失败: ${error.message}`, 'DATABASE_ERROR', error);
      }

      return (questions || []).map(question => ({
        ...question,
        tags: question.question_tags?.map(qt => qt.tags.name) || [],
        categoryName: question.question_categories?.name
      }));
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`数据库操作失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  // 问题 CRUD 操作
  async createQuestion(questionData) {
    try {
      // 简化验证逻辑，只检查必要字段
      if (!questionData.categoryId || typeof questionData.categoryId !== 'string') {
        throw new StorageError('分类ID是必填的', 'VALIDATION_ERROR');
      }

      if (!questionData.title || typeof questionData.title !== 'string' || questionData.title.trim() === '') {
        throw new StorageError('问题标题是必填的', 'VALIDATION_ERROR');
      }

      if (!questionData.content || typeof questionData.content !== 'string' || questionData.content.trim() === '') {
        throw new StorageError('问题内容是必填的', 'VALIDATION_ERROR');
      }

      if (!questionData.difficulty || typeof questionData.difficulty !== 'string') {
        throw new StorageError('难度等级是必填的', 'VALIDATION_ERROR');
      }

      // 生成问题ID
      const questionId = this.generateId(questionData.title);

      // 插入问题
      const { data: question, error: questionError } = await this.supabase
        .from('questions')
        .insert({
          id: questionId,
          category_id: questionData.categoryId,
          title: questionData.title,
          content: questionData.content,
          difficulty: questionData.difficulty || 'medium'
        })
        .select()
        .single();

      if (questionError) {
        throw new StorageError(`创建问题失败: ${questionError.message}`, 'DATABASE_ERROR', questionError);
      }

      // 处理标签
      if (questionData.tags && questionData.tags.length > 0) {
        await this.addTagsToQuestion(questionId, questionData.tags);
      }

      this.clearCache();
      return question;
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`数据库操作失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  async updateQuestion(id, questionData) {
    try {
      // 简化验证逻辑，只检查必要字段
      if (!questionData.title || typeof questionData.title !== 'string' || questionData.title.trim() === '') {
        throw new StorageError('问题标题是必填的', 'VALIDATION_ERROR');
      }

      if (!questionData.content || typeof questionData.content !== 'string' || questionData.content.trim() === '') {
        throw new StorageError('问题内容是必填的', 'VALIDATION_ERROR');
      }

      if (questionData.difficulty && !['easy', 'medium', 'hard'].includes(questionData.difficulty)) {
        throw new StorageError('难度等级必须是 easy、medium 或 hard', 'VALIDATION_ERROR');
      }

      // 构建更新对象，只包含提供的字段
      const updateData = {};
      if (questionData.title !== undefined) updateData.title = questionData.title;
      if (questionData.content !== undefined) updateData.content = questionData.content;
      if (questionData.difficulty !== undefined) updateData.difficulty = questionData.difficulty;
      if (questionData.categoryId !== undefined) updateData.category_id = questionData.categoryId;

      // 更新问题
      const { data: question, error: questionError } = await this.supabase
        .from('questions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (questionError) {
        if (questionError.code === 'PGRST116') {
          throw new StorageError(`问题 ${id} 不存在`, 'QUESTION_NOT_FOUND');
        }
        throw new StorageError(`更新问题失败: ${questionError.message}`, 'DATABASE_ERROR', questionError);
      }

      // 更新标签
      if (questionData.tags !== undefined) {
        await this.updateQuestionTags(id, questionData.tags);
      }

      this.clearCache();
      return question;
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`数据库操作失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  async deleteQuestion(id) {
    try {
      const { data: question, error } = await this.supabase
        .from('questions')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new StorageError(`问题 ${id} 不存在`, 'QUESTION_NOT_FOUND');
        }
        throw new StorageError(`删除问题失败: ${error.message}`, 'DATABASE_ERROR', error);
      }

      this.clearCache();
      return question;
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`数据库操作失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  // 标签辅助方法
  async addTagsToQuestion(questionId, tags) {
    try {
      // 确保标签存在
      for (const tagName of tags) {
        await this.supabase
          .from('tags')
          .upsert({ name: tagName }, { onConflict: 'name' });
      }

      // 获取标签 ID
      const { data: tagData, error: tagError } = await this.supabase
        .from('tags')
        .select('id, name')
        .in('name', tags);

      if (tagError) {
        throw new StorageError(`获取标签失败: ${tagError.message}`, 'DATABASE_ERROR', tagError);
      }

      // 创建问题-标签关联
      const questionTags = tagData.map(tag => ({
        question_id: questionId,
        tag_id: tag.id
      }));

      const { error: linkError } = await this.supabase
        .from('question_tags')
        .insert(questionTags);

      if (linkError) {
        throw new StorageError(`关联标签失败: ${linkError.message}`, 'DATABASE_ERROR', linkError);
      }
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`添加标签失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  async updateQuestionTags(questionId, tags) {
    try {
      // 删除现有关联
      await this.supabase
        .from('question_tags')
        .delete()
        .eq('question_id', questionId);

      // 添加新标签
      if (tags && tags.length > 0) {
        await this.addTagsToQuestion(questionId, tags);
      }
    } catch (error) {
      throw new StorageError(`更新问题标签失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  // 统计信息
  async getStatistics() {
    try {
      const [categoriesResult, questionsResult, tagsResult] = await Promise.all([
        this.supabase.from('question_categories').select('*', { count: 'exact', head: true }),
        this.supabase.from('questions').select('difficulty', { count: 'exact' }),
        this.supabase.from('tags').select('*', { count: 'exact', head: true })
      ]);

      if (categoriesResult.error || questionsResult.error || tagsResult.error) {
        throw new StorageError('获取统计信息失败', 'DATABASE_ERROR');
      }

      // 计算难度分布
      const difficultyCount = { easy: 0, medium: 0, hard: 0 };
      (questionsResult.data || []).forEach(question => {
        if (question.difficulty) {
          difficultyCount[question.difficulty]++;
        }
      });

      return {
        totalCategories: categoriesResult.count || 0,
        totalQuestions: questionsResult.count || 0,
        totalTags: tagsResult.count || 0,
        difficultyDistribution: difficultyCount,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`数据库操作失败: ${error.message}`, 'DATABASE_ERROR', error);
    }
  }

  // 健康检查
  async healthCheck() {
    try {
      const { data, error } = await this.supabase
        .from('question_categories')
        .select('id')
        .limit(1);

      if (error) {
        return {
          status: 'unhealthy',
          storage: 'database',
          error: error.message
        };
      }

      const stats = await this.getStatistics();
      
      return {
        status: 'healthy',
        storage: 'database',
        cacheEnabled: this.config.cacheEnabled,
        ...stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        storage: 'database',
        error: error.message
      };
    }
  }
}

export default DatabaseStorage;
