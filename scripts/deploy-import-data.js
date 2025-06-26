#!/usr/bin/env node

/**
 * 部署后数据导入脚本
 * 用于在 Vercel 部署后导入初始数据到 Supabase 数据库
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 配置信息');
  console.error('请确保设置了以下环境变量:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 导入的分类数据
const categories = [
  {
    id: 'uranium-decay',
    name: '铀衰变与放射性',
    description: '铀系衰变链、放射性衰变常数、半衰期计算等相关问题'
  },
  {
    id: 'diffusion-transport',
    name: '扩散与传质',
    description: '物质在地质介质中的扩散过程、传质机制等'
  },
  {
    id: 'ion-exchange',
    name: '离子交换',
    description: '离子交换反应、选择性系数、交换平衡等'
  },
  {
    id: 'adsorption-desorption',
    name: '吸附与解吸',
    description: '表面吸附过程、等温线模型、吸附动力学等'
  },
  {
    id: 'chemical-equilibrium',
    name: '化学平衡',
    description: '溶液化学平衡、络合反应、沉淀溶解等'
  },
  {
    id: 'kinetics-thermodynamics',
    name: '动力学与热力学',
    description: '反应动力学、热力学参数、能量变化等'
  },
  {
    id: 'environmental-modeling',
    name: '环境建模',
    description: '环境过程数学建模、数值模拟等'
  },
  {
    id: 'analytical-methods',
    name: '分析方法',
    description: '地球化学分析技术、数据处理方法等'
  }
];

// 导入的问题数据（示例）
const sampleQuestions = [
  {
    id: 'uranium-decay-basic',
    category_id: 'uranium-decay',
    title: '铀-238衰变链基础问题',
    content: '请建立铀-238衰变链的数学模型，包括各个子体的浓度随时间的变化关系。',
    difficulty: 'medium'
  },
  {
    id: 'diffusion-fick-law',
    category_id: 'diffusion-transport',
    title: 'Fick定律应用',
    content: '在多孔介质中，某污染物的扩散系数为D，请用Fick第二定律建立浓度分布的偏微分方程。',
    difficulty: 'easy'
  },
  {
    id: 'ion-exchange-selectivity',
    category_id: 'ion-exchange',
    title: '离子交换选择性',
    content: '推导二元离子交换系统的选择性系数表达式，并分析影响选择性的因素。',
    difficulty: 'hard'
  }
];

// 问题对应的标签
const questionTags = {
  'uranium-decay-basic': ['铀衰变', '衰变链', '数学建模'],
  'diffusion-fick-law': ['Fick定律', '扩散', '偏微分方程'],
  'ion-exchange-selectivity': ['离子交换', '选择性系数', '热力学']
};

async function importData() {
  console.log('🚀 开始导入数据到 Supabase 数据库...');

  try {
    // 1. 导入分类数据
    console.log('📁 导入分类数据...');
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('question_categories')
      .upsert(categories, { onConflict: 'id' })
      .select();

    if (categoriesError) {
      console.error('❌ 分类数据导入失败:', categoriesError);
      return;
    }

    console.log(`✅ 成功导入 ${categoriesData.length} 个分类`);

    // 2. 导入问题数据
    console.log('❓ 导入问题数据...');
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .upsert(sampleQuestions, { onConflict: 'id' })
      .select();

    if (questionsError) {
      console.error('❌ 问题数据导入失败:', questionsError);
      return;
    }

    console.log(`✅ 成功导入 ${questionsData.length} 个问题`);

    // 3. 导入标签数据
    console.log('🏷️ 导入标签数据...');
    const allTags = [...new Set(Object.values(questionTags).flat())];
    const tagData = allTags.map(tag => ({ name: tag }));

    const { data: tagsData, error: tagsError } = await supabase
      .from('tags')
      .upsert(tagData, { onConflict: 'name' })
      .select();

    if (tagsError) {
      console.error('❌ 标签数据导入失败:', tagsError);
      return;
    }

    console.log(`✅ 成功导入 ${tagsData.length} 个标签`);

    // 4. 建立问题-标签关联
    console.log('🔗 建立问题-标签关联...');
    const questionTagRelations = [];

    for (const [questionId, tags] of Object.entries(questionTags)) {
      for (const tagName of tags) {
        const tag = tagsData.find(t => t.name === tagName);
        if (tag) {
          questionTagRelations.push({
            question_id: questionId,
            tag_id: tag.id
          });
        }
      }
    }

    const { error: relationsError } = await supabase
      .from('question_tags')
      .upsert(questionTagRelations, { onConflict: 'question_id,tag_id' });

    if (relationsError) {
      console.error('❌ 问题-标签关联导入失败:', relationsError);
      return;
    }

    console.log(`✅ 成功建立 ${questionTagRelations.length} 个问题-标签关联`);

    console.log('🎉 数据导入完成！');
    console.log('📊 导入统计:');
    console.log(`   - 分类: ${categoriesData.length} 个`);
    console.log(`   - 问题: ${questionsData.length} 个`);
    console.log(`   - 标签: ${tagsData.length} 个`);
    console.log(`   - 关联: ${questionTagRelations.length} 个`);

  } catch (error) {
    console.error('❌ 数据导入过程中发生错误:', error);
  }
}

// 执行导入
if (require.main === module) {
  importData();
}

module.exports = { importData };
