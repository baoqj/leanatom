// 管理员数据导入 API
import { getStorageManager } from '../../../lib/storage/StorageManager.js';

// 初始分类数据
const initialCategories = [
  {
    name: '铀衰变与放射性',
    description: '铀系衰变链、放射性衰变常数、半衰期计算等相关问题'
  },
  {
    name: '扩散与传质',
    description: '物质在地质介质中的扩散过程、传质机制等'
  },
  {
    name: '离子交换',
    description: '离子交换反应、选择性系数、交换平衡等'
  },
  {
    name: '吸附与解吸',
    description: '表面吸附过程、等温线模型、吸附动力学等'
  },
  {
    name: '化学平衡',
    description: '溶液化学平衡、络合反应、沉淀溶解等'
  },
  {
    name: '动力学与热力学',
    description: '反应动力学、热力学参数、能量变化等'
  },
  {
    name: '环境建模',
    description: '环境过程数学建模、数值模拟等'
  },
  {
    name: '分析方法',
    description: '地球化学分析技术、数据处理方法等'
  }
];

// 初始问题数据
const initialQuestions = [
  {
    title: '铀-238衰变链基础问题',
    content: '请建立铀-238衰变链的数学模型，包括各个子体的浓度随时间的变化关系。考虑以下因素：\n\n1. 铀-238的衰变常数λ₁\n2. 镭-226的衰变常数λ₂\n3. 氡-222的衰变常数λ₃\n\n建立微分方程组并求解各核素浓度N(t)的表达式。',
    difficulty: 'medium',
    tags: ['铀衰变', '衰变链', '数学建模', '微分方程'],
    categoryName: '铀衰变与放射性'
  },
  {
    title: 'Fick定律在多孔介质中的应用',
    content: '在多孔介质中，某污染物的扩散系数为D，孔隙度为φ，请用Fick第二定律建立浓度分布的偏微分方程。\n\n考虑：\n- 一维扩散过程\n- 稳态和非稳态条件\n- 边界条件的影响\n\n推导相应的数学表达式并分析物理意义。',
    difficulty: 'easy',
    tags: ['Fick定律', '扩散', '偏微分方程', '多孔介质'],
    categoryName: '扩散与传质'
  },
  {
    title: '离子交换选择性系数推导',
    content: '推导二元离子交换系统的选择性系数表达式，并分析影响选择性的因素。\n\n考虑反应：\nA⁺ + B-R ⇌ A-R + B⁺\n\n其中R表示交换剂。推导：\n1. 平衡常数表达式\n2. 选择性系数定义\n3. 活度系数的影响\n4. 温度依赖性',
    difficulty: 'hard',
    tags: ['离子交换', '选择性系数', '热力学', '平衡常数'],
    categoryName: '离子交换'
  },
  {
    title: 'Langmuir吸附等温线模型',
    content: '推导Langmuir吸附等温线方程，并分析其适用条件和局限性。\n\n包括：\n1. 基本假设\n2. 动力学推导过程\n3. 线性化方法\n4. 参数物理意义\n5. 与Freundlich模型的比较',
    difficulty: 'medium',
    tags: ['Langmuir', '吸附等温线', '表面化学', '动力学'],
    categoryName: '吸附与解吸'
  },
  {
    title: '溶液中络合反应平衡计算',
    content: '计算含有多种配体的溶液中金属离子的络合反应平衡。\n\n给定：\n- 金属离子M²⁺浓度\n- 配体L⁻浓度\n- 各级络合常数β₁, β₂, β₃\n\n求解各种络合物的浓度分布和α分布系数。',
    difficulty: 'medium',
    tags: ['络合反应', '化学平衡', '分布系数', '配体'],
    categoryName: '化学平衡'
  }
];

export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允许 POST 请求' });
  }

  try {
    const storageManager = await getStorageManager();
    
    console.log('🚀 开始导入初始数据...');
    
    // 导入分类
    const createdCategories = [];
    for (const categoryData of initialCategories) {
      try {
        const category = await storageManager.createCategory(categoryData);
        createdCategories.push(category);
        console.log(`✅ 创建分类: ${category.name}`);
      } catch (error) {
        console.log(`⚠️ 分类已存在或创建失败: ${categoryData.name}`, error.message);
      }
    }

    // 导入问题
    const createdQuestions = [];
    for (const questionData of initialQuestions) {
      try {
        // 查找对应的分类ID
        const categories = await storageManager.getCategories();
        const category = categories.find(c => c.name === questionData.categoryName);
        
        if (category) {
          const question = {
            ...questionData,
            categoryId: category.id
          };
          delete question.categoryName;
          
          const createdQuestion = await storageManager.createQuestion(question);
          createdQuestions.push(createdQuestion);
          console.log(`✅ 创建问题: ${createdQuestion.title}`);
        } else {
          console.log(`⚠️ 未找到分类: ${questionData.categoryName}`);
        }
      } catch (error) {
        console.log(`⚠️ 问题创建失败: ${questionData.title}`, error.message);
      }
    }

    // 获取统计信息
    const statistics = await storageManager.getStatistics();
    
    res.status(200).json({
      success: true,
      message: '数据导入完成',
      imported: {
        categories: createdCategories.length,
        questions: createdQuestions.length
      },
      statistics
    });

  } catch (error) {
    console.error('数据导入失败:', error);
    res.status(500).json({
      error: '数据导入失败',
      details: error.message
    });
  }
}
