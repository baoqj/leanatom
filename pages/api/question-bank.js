import { QuestionBankManager, initialQuestionBank } from '../../data/questionBank.js';
import fs from 'fs';
import path from 'path';

// 数据存储路径
const DATA_FILE = path.join(process.cwd(), 'data', 'questionBankData.json');

// 初始化问题库管理器
let questionBankManager;

// 加载数据
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      questionBankManager = new QuestionBankManager(data);
    } else {
      questionBankManager = new QuestionBankManager(initialQuestionBank);
      saveData();
    }
  } catch (error) {
    console.error('加载问题库数据失败:', error);
    questionBankManager = new QuestionBankManager(initialQuestionBank);
  }
}

// 保存数据
function saveData() {
  try {
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(questionBankManager.data, null, 2));
  } catch (error) {
    console.error('保存问题库数据失败:', error);
  }
}

// 初始化
loadData();

export default function handler(req, res) {
  const { method, query, body } = req;

  try {
    switch (method) {
      case 'GET':
        handleGet(req, res, query);
        break;
      case 'POST':
        handlePost(req, res, body);
        break;
      case 'PUT':
        handlePut(req, res, body);
        break;
      case 'DELETE':
        handleDelete(req, res, query);
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
function handleGet(req, res, query) {
  const { action, categoryId, questionId, search } = query;

  switch (action) {
    case 'categories':
      // 获取所有分类
      const categories = questionBankManager.getCategories();
      res.status(200).json({ categories });
      break;

    case 'category':
      // 获取特定分类
      if (!categoryId) {
        return res.status(400).json({ error: '缺少分类 ID' });
      }
      const category = questionBankManager.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ error: '分类不存在' });
      }
      res.status(200).json({ category });
      break;

    case 'question':
      // 获取特定问题
      if (!categoryId || !questionId) {
        return res.status(400).json({ error: '缺少分类 ID 或问题 ID' });
      }
      const question = questionBankManager.getQuestion(categoryId, questionId);
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
      const searchResults = questionBankManager.searchQuestions(search);
      res.status(200).json({ results: searchResults });
      break;

    case 'statistics':
      // 获取统计信息
      const statistics = questionBankManager.getStatistics();
      res.status(200).json({ statistics });
      break;

    case 'export':
      // 导出数据
      const exportData = questionBankManager.exportData();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="question-bank.json"');
      res.status(200).send(exportData);
      break;

    default:
      // 默认返回所有分类
      const allCategories = questionBankManager.getCategories();
      res.status(200).json({ categories: allCategories });
  }
}

// 处理 POST 请求
function handlePost(req, res, body) {
  const { action, categoryId, category, question } = body;

  switch (action) {
    case 'addCategory':
      // 添加新分类
      if (!category || !category.name) {
        return res.status(400).json({ error: '缺少分类信息' });
      }
      const newCategory = questionBankManager.addCategory(category);
      saveData();
      res.status(201).json({ category: newCategory });
      break;

    case 'addQuestion':
      // 添加新问题
      if (!categoryId || !question || !question.title || !question.content) {
        return res.status(400).json({ error: '缺少问题信息' });
      }
      const newQuestion = questionBankManager.addQuestion(categoryId, question);
      if (!newQuestion) {
        return res.status(404).json({ error: '分类不存在' });
      }
      saveData();
      res.status(201).json({ question: newQuestion });
      break;

    case 'import':
      // 导入数据
      if (!body.data) {
        return res.status(400).json({ error: '缺少导入数据' });
      }
      const success = questionBankManager.importData(body.data);
      if (success) {
        saveData();
        res.status(200).json({ message: '数据导入成功' });
      } else {
        res.status(400).json({ error: '数据格式错误' });
      }
      break;

    default:
      res.status(400).json({ error: '未知操作' });
  }
}

// 处理 PUT 请求
function handlePut(req, res, body) {
  const { action, categoryId, questionId, updates } = body;

  switch (action) {
    case 'updateCategory':
      // 更新分类
      if (!categoryId || !updates) {
        return res.status(400).json({ error: '缺少分类 ID 或更新信息' });
      }
      const updatedCategory = questionBankManager.updateCategory(categoryId, updates);
      if (!updatedCategory) {
        return res.status(404).json({ error: '分类不存在' });
      }
      saveData();
      res.status(200).json({ category: updatedCategory });
      break;

    case 'updateQuestion':
      // 更新问题
      if (!categoryId || !questionId || !updates) {
        return res.status(400).json({ error: '缺少问题 ID 或更新信息' });
      }
      const updatedQuestion = questionBankManager.updateQuestion(categoryId, questionId, updates);
      if (!updatedQuestion) {
        return res.status(404).json({ error: '问题不存在' });
      }
      saveData();
      res.status(200).json({ question: updatedQuestion });
      break;

    default:
      res.status(400).json({ error: '未知操作' });
  }
}

// 处理 DELETE 请求
function handleDelete(req, res, query) {
  const { action, categoryId, questionId } = query;

  switch (action) {
    case 'deleteCategory':
      // 删除分类
      if (!categoryId) {
        return res.status(400).json({ error: '缺少分类 ID' });
      }
      const deletedCategory = questionBankManager.deleteCategory(categoryId);
      if (!deletedCategory) {
        return res.status(404).json({ error: '分类不存在' });
      }
      saveData();
      res.status(200).json({ message: '分类删除成功', category: deletedCategory });
      break;

    case 'deleteQuestion':
      // 删除问题
      if (!categoryId || !questionId) {
        return res.status(400).json({ error: '缺少分类 ID 或问题 ID' });
      }
      const deletedQuestion = questionBankManager.deleteQuestion(categoryId, questionId);
      if (!deletedQuestion) {
        return res.status(404).json({ error: '问题不存在' });
      }
      saveData();
      res.status(200).json({ message: '问题删除成功', question: deletedQuestion });
      break;

    default:
      res.status(400).json({ error: '未知操作' });
  }
}
