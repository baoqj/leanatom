// 问题库 API - 使用 Supabase 数据库版本
import { QuestionBankDB } from '../../lib/supabase.js';

export default async function handler(req, res) {
  const { method, query, body } = req;

  try {
    switch (method) {
      case 'GET':
        await handleGet(req, res, query);
        break;
      case 'POST':
        await handlePost(req, res, body);
        break;
      case 'PUT':
        await handlePut(req, res, body);
        break;
      case 'DELETE':
        await handleDelete(req, res, query);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ error: '方法不允许' });
    }
  } catch (error) {
    console.error('API 错误:', error);
    res.status(500).json({ error: '服务器内部错误', details: error.message });
  }
}

// 处理 GET 请求
async function handleGet(req, res, query) {
  const { action, categoryId, questionId, search, tag } = query;

  switch (action) {
    case 'categories':
      // 获取所有分类
      const categories = await QuestionBankDB.getAllCategories();
      res.status(200).json({ categories });
      break;

    case 'category':
      // 获取特定分类
      if (!categoryId) {
        return res.status(400).json({ error: '缺少分类 ID' });
      }
      const category = await QuestionBankDB.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ error: '分类不存在' });
      }
      res.status(200).json({ category });
      break;

    case 'search':
      // 搜索问题
      if (!search && !tag) {
        return res.status(400).json({ error: '缺少搜索参数' });
      }
      
      let searchResults;
      if (tag) {
        searchResults = await QuestionBankDB.searchByTag(tag);
      } else {
        searchResults = await QuestionBankDB.searchQuestions(search);
      }
      
      // 按分类组织搜索结果
      const categoriesMap = {};
      searchResults.forEach(question => {
        const categoryName = question.categoryName || '未分类';
        if (!categoriesMap[categoryName]) {
          categoriesMap[categoryName] = {
            name: categoryName,
            questions: []
          };
        }
        categoriesMap[categoryName].questions.push({
          id: question.id,
          title: question.title,
          content: question.content,
          difficulty: question.difficulty,
          tags: question.tags,
          createdAt: question.createdAt
        });
      });

      res.status(200).json({ 
        categories: Object.values(categoriesMap),
        total: searchResults.length
      });
      break;

    case 'tags':
      // 获取所有标签
      const tags = await QuestionBankDB.getAllTags();
      res.status(200).json({ tags });
      break;

    default:
      // 默认返回所有分类
      const allCategories = await QuestionBankDB.getAllCategories();
      res.status(200).json({ categories: allCategories });
  }
}

// 处理 POST 请求
async function handlePost(req, res, body) {
  const { action, data } = body;

  switch (action) {
    case 'create-category':
      // 创建新分类
      if (!data || !data.id || !data.name) {
        return res.status(400).json({ error: '缺少必要的分类信息' });
      }
      
      const newCategory = await QuestionBankDB.createCategory({
        id: data.id,
        name: data.name,
        description: data.description || ''
      });
      
      res.status(201).json({ 
        success: true, 
        message: '分类创建成功',
        category: newCategory
      });
      break;

    case 'create-question':
      // 创建新问题
      if (!data || !data.id || !data.title || !data.content || !data.categoryId) {
        return res.status(400).json({ error: '缺少必要的问题信息' });
      }
      
      const newQuestion = await QuestionBankDB.createQuestion({
        id: data.id,
        categoryId: data.categoryId,
        title: data.title,
        content: data.content,
        difficulty: data.difficulty || 'medium',
        tags: data.tags || []
      });
      
      res.status(201).json({ 
        success: true, 
        message: '问题创建成功',
        question: newQuestion
      });
      break;

    default:
      res.status(400).json({ error: '未知的操作类型' });
  }
}

// 处理 PUT 请求
async function handlePut(req, res, body) {
  const { action, data, categoryId, questionId } = body;

  switch (action) {
    case 'update-category':
      // 更新分类
      if (!categoryId || !data) {
        return res.status(400).json({ error: '缺少分类 ID 或更新数据' });
      }
      
      const updatedCategory = await QuestionBankDB.updateCategory(categoryId, {
        name: data.name,
        description: data.description
      });
      
      res.status(200).json({ 
        success: true, 
        message: '分类更新成功',
        category: updatedCategory
      });
      break;

    case 'update-question':
      // 更新问题
      if (!questionId || !data) {
        return res.status(400).json({ error: '缺少问题 ID 或更新数据' });
      }
      
      const updatedQuestion = await QuestionBankDB.updateQuestion(questionId, {
        title: data.title,
        content: data.content,
        difficulty: data.difficulty,
        categoryId: data.categoryId,
        tags: data.tags
      });
      
      res.status(200).json({ 
        success: true, 
        message: '问题更新成功',
        question: updatedQuestion
      });
      break;

    default:
      res.status(400).json({ error: '未知的操作类型' });
  }
}

// 处理 DELETE 请求
async function handleDelete(req, res, query) {
  const { action, categoryId, questionId } = query;

  switch (action) {
    case 'delete-category':
      // 删除分类
      if (!categoryId) {
        return res.status(400).json({ error: '缺少分类 ID' });
      }
      
      await QuestionBankDB.deleteCategory(categoryId);
      
      res.status(200).json({ 
        success: true, 
        message: '分类删除成功'
      });
      break;

    case 'delete-question':
      // 删除问题
      if (!questionId) {
        return res.status(400).json({ error: '缺少问题 ID' });
      }
      
      await QuestionBankDB.deleteQuestion(questionId);
      
      res.status(200).json({ 
        success: true, 
        message: '问题删除成功'
      });
      break;

    default:
      res.status(400).json({ error: '未知的操作类型' });
  }
}
