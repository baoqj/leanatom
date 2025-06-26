// 问题库 API 路由 - 使用 Supabase 数据库存储
import { getStorageManager } from '../../lib/storage/StorageManager.js';

export default async function handler(req, res) {
  const { method, query, body } = req;

  try {
    // 初始化存储管理器 (自动使用 Supabase 数据库)
    const storageManager = await getStorageManager();

    switch (method) {
      case 'GET':
        await handleGet(req, res, query, storageManager);
        break;
      case 'POST':
        await handlePost(req, res, body, storageManager);
        break;
      case 'PUT':
        await handlePut(req, res, body, storageManager);
        break;
      case 'DELETE':
        await handleDelete(req, res, query, storageManager);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ error: '方法不允许' });
    }
  } catch (error) {
    console.error('API 错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
}

// 处理 GET 请求
async function handleGet(req, res, query, storageManager) {
  const { action, categoryId, questionId, search, tags, difficulty } = query;

  switch (action) {
    case 'categories':
      // 获取所有分类
      const categories = await storageManager.getAllCategories();
      res.status(200).json({ categories });
      break;

    case 'category':
      // 获取特定分类
      if (!categoryId) {
        return res.status(400).json({ error: '缺少分类 ID' });
      }
      const category = await storageManager.getCategoryById(categoryId);
      if (!category) {
        return res.status(404).json({ error: '分类不存在' });
      }
      res.status(200).json({ category });
      break;

    case 'questions':
      // 获取分类下的问题
      if (!categoryId) {
        return res.status(400).json({ error: '缺少分类 ID' });
      }
      const questions = await storageManager.getQuestionsByCategory(categoryId);
      res.status(200).json({ questions });
      break;

    case 'question':
      // 获取特定问题
      if (!questionId) {
        return res.status(400).json({ error: '缺少问题 ID' });
      }
      const question = await storageManager.getQuestionById(questionId);
      if (!question) {
        return res.status(404).json({ error: '问题不存在' });
      }
      res.status(200).json({ question });
      break;

    case 'search':
      // 搜索问题
      if (!search) {
        return res.status(400).json({ error: '缺少搜索关键词' });
      }
      const filters = {};
      if (categoryId) filters.categoryId = categoryId;
      if (difficulty) filters.difficulty = difficulty;
      if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];

      const searchResults = await storageManager.searchQuestions(search, filters);
      res.status(200).json({ results: searchResults });
      break;

    case 'tags':
      // 获取所有标签
      const allTags = await storageManager.getAllTags();
      res.status(200).json({ tags: allTags });
      break;

    case 'statistics':
      // 获取统计信息
      const statistics = await storageManager.getStatistics();
      res.status(200).json({ statistics });
      break;

    case 'export':
      // 导出数据
      const exportData = await storageManager.exportData();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="question-bank.json"');
      res.status(200).send(JSON.stringify(exportData, null, 2));
      break;

    case 'health':
      // 健康检查
      const health = await storageManager.healthCheck();
      res.status(200).json({ health });
      break;

    default:
      // 默认返回所有分类
      const allCategories = await storageManager.getAllCategories();
      res.status(200).json({ categories: allCategories });
  }
}

// 处理 POST 请求
async function handlePost(req, res, body, storageManager) {
  const { action, categoryId, category, question } = body;

  switch (action) {
    case 'addCategory':
      // 添加新分类
      if (!category || !category.name) {
        return res.status(400).json({ error: '缺少分类信息' });
      }
      try {
        const newCategory = await storageManager.createCategory(category);
        res.status(201).json({ category: newCategory });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
      break;

    case 'addQuestion':
      // 添加新问题
      if (!categoryId || !question || !question.title || !question.content) {
        return res.status(400).json({ error: '缺少问题信息' });
      }
      try {
        const questionData = { ...question, categoryId };
        const newQuestion = await storageManager.createQuestion(questionData);
        res.status(201).json({ question: newQuestion });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
      break;

    case 'import':
      // 导入数据
      if (!body.data) {
        return res.status(400).json({ error: '缺少导入数据' });
      }
      try {
        const success = await storageManager.importData(body.data);
        res.status(200).json({ message: '数据导入成功', success });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
      break;

    default:
      res.status(400).json({ error: '未知操作' });
  }
}

// 处理 PUT 请求
async function handlePut(req, res, body, storageManager) {
  const { action, categoryId, questionId, updates } = body;

  switch (action) {
    case 'updateCategory':
      // 更新分类
      if (!categoryId || !updates) {
        return res.status(400).json({ error: '缺少分类 ID 或更新信息' });
      }
      try {
        const updatedCategory = await storageManager.updateCategory(categoryId, updates);
        res.status(200).json({ category: updatedCategory });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
      break;

    case 'updateQuestion':
      // 更新问题
      if (!questionId || !updates) {
        return res.status(400).json({ error: '缺少问题 ID 或更新信息' });
      }
      try {
        const updatedQuestion = await storageManager.updateQuestion(questionId, updates);
        res.status(200).json({ question: updatedQuestion });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
      break;

    default:
      res.status(400).json({ error: '未知操作' });
  }
}

// 处理 DELETE 请求
async function handleDelete(req, res, query, storageManager) {
  const { action, categoryId, questionId } = query;

  switch (action) {
    case 'deleteCategory':
      // 删除分类
      if (!categoryId) {
        return res.status(400).json({ error: '缺少分类 ID' });
      }
      try {
        const deletedCategory = await storageManager.deleteCategory(categoryId);
        res.status(200).json({ message: '分类删除成功', category: deletedCategory });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
      break;

    case 'deleteQuestion':
      // 删除问题
      if (!questionId) {
        return res.status(400).json({ error: '缺少问题 ID' });
      }
      try {
        const deletedQuestion = await storageManager.deleteQuestion(questionId);
        res.status(200).json({ message: '问题删除成功', question: deletedQuestion });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
      break;

    default:
      res.status(400).json({ error: '未知操作' });
  }
}
