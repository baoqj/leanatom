#!/usr/bin/env node

// 数据库设置脚本 - 用于 Netlify 部署时自动设置数据库
const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('跳过数据库设置 - 缺少 Supabase 配置');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 问题库初始数据
const initialData = {
  categories: [
    {
      id: 'uranium-decay',
      name: '铀衰变与放射性',
      description: '铀及其他放射性核素的衰变、迁移和浓度变化问题',
      questions: [
        {
          id: 'radon-migration',
          title: '放射性核素的迁移距离估算',
          content: '设 Rn-222 的半衰期为 3.82 d，地下水流速 0.2 m/day，不考虑扩散作用，证明 Rn-222 在完全衰变前的迁移距离不超过 1.5 m。',
          tags: ['氡', '迁移', '半衰期'],
          difficulty: 'easy'
        },
        {
          id: 'uranium-sorption',
          title: '铀的吸附平衡验证',
          content: '在 pH = 6.5，温度 25°C 条件下，设铀在石英砂上的分配系数 Kd = 0.5 L/kg，初始铀浓度 10 mg/L，固液比 1:10，证明平衡后液相铀浓度约为 1.82 mg/L。',
          tags: ['铀', '吸附', '分配系数'],
          difficulty: 'medium'
        }
      ]
    },
    {
      id: 'diffusion-transport',
      name: '扩散与传质',
      description: '物质在多孔介质中的扩散、对流和传质过程',
      questions: [
        {
          id: 'diffusion-concentration-decay',
          title: '扩散控制下的浓度衰减验证',
          content: '在有效扩散系数 D_eff = 1e-9 m²/s，初始浓度 C₀ = 0.1 mol/m³，边界为零浓度的条件下，证明：在距离 x = 1 m 处，时间 t = 30 yr 后的浓度 C(x,t) 小于 0.001 mol/m³。',
          tags: ['扩散', '浓度', '边界条件'],
          difficulty: 'medium'
        }
      ]
    }
  ]
};

async function setupDatabase() {
  console.log('开始设置数据库...');

  try {
    // 检查是否已有数据
    const { data: existingCategories, error: checkError } = await supabase
      .from('question_categories')
      .select('id')
      .limit(1);

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingCategories && existingCategories.length > 0) {
      console.log('数据库已有数据，跳过初始化');
      return;
    }

    console.log('初始化数据库数据...');

    // 收集所有标签
    const allTags = new Set();
    initialData.categories.forEach(category => {
      category.questions.forEach(question => {
        question.tags.forEach(tag => allTags.add(tag));
      });
    });

    // 插入标签
    const tagsArray = Array.from(allTags).map(tag => ({ name: tag }));
    const { data: insertedTags, error: tagsError } = await supabase
      .from('tags')
      .insert(tagsArray)
      .select();

    if (tagsError) {
      throw new Error(`插入标签失败: ${tagsError.message}`);
    }

    // 创建标签名称到ID的映射
    const tagNameToId = {};
    insertedTags.forEach(tag => {
      tagNameToId[tag.name] = tag.id;
    });

    // 插入分类和问题
    for (const category of initialData.categories) {
      // 插入分类
      const { error: categoryError } = await supabase
        .from('question_categories')
        .insert({
          id: category.id,
          name: category.name,
          description: category.description
        });

      if (categoryError) {
        throw new Error(`插入分类失败: ${categoryError.message}`);
      }

      // 插入问题
      for (const question of category.questions) {
        const { error: questionError } = await supabase
          .from('questions')
          .insert({
            id: question.id,
            category_id: category.id,
            title: question.title,
            content: question.content,
            difficulty: question.difficulty
          });

        if (questionError) {
          throw new Error(`插入问题失败: ${questionError.message}`);
        }

        // 插入问题标签关联
        const questionTags = question.tags.map(tagName => ({
          question_id: question.id,
          tag_id: tagNameToId[tagName]
        }));

        const { error: questionTagsError } = await supabase
          .from('question_tags')
          .insert(questionTags);

        if (questionTagsError) {
          throw new Error(`插入问题标签关联失败: ${questionTagsError.message}`);
        }
      }
    }

    console.log('数据库初始化完成！');

  } catch (error) {
    console.error('数据库设置失败:', error.message);
    // 在部署环境中不要因为数据库设置失败而中断部署
    if (process.env.NODE_ENV === 'production') {
      console.log('生产环境中跳过数据库设置错误');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

// 执行设置
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
