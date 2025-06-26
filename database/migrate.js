// 数据库迁移脚本 - 将本地 JSON 数据导入到 Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // 使用服务角色密钥

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('请设置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 读取本地数据
const dataPath = path.join(__dirname, '../data/questionBankData.json');
const questionBankData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

async function migrateData() {
  console.log('开始数据迁移...');

  try {
    // 1. 清空现有数据（可选）
    console.log('清空现有数据...');
    await supabase.from('question_tags').delete().neq('question_id', '');
    await supabase.from('questions').delete().neq('id', '');
    await supabase.from('tags').delete().neq('id', 0);
    await supabase.from('question_categories').delete().neq('id', '');

    // 2. 插入分类数据
    console.log('插入分类数据...');
    const categories = questionBankData.categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description
    }));

    const { error: categoriesError } = await supabase
      .from('question_categories')
      .insert(categories);

    if (categoriesError) {
      throw new Error(`插入分类失败: ${categoriesError.message}`);
    }
    console.log(`成功插入 ${categories.length} 个分类`);

    // 3. 收集所有标签
    console.log('收集并插入标签...');
    const allTags = new Set();
    questionBankData.categories.forEach(category => {
      category.questions.forEach(question => {
        question.tags.forEach(tag => allTags.add(tag));
      });
    });

    const tagsArray = Array.from(allTags).map(tag => ({ name: tag }));
    const { data: insertedTags, error: tagsError } = await supabase
      .from('tags')
      .insert(tagsArray)
      .select();

    if (tagsError) {
      throw new Error(`插入标签失败: ${tagsError.message}`);
    }
    console.log(`成功插入 ${insertedTags.length} 个标签`);

    // 创建标签名称到ID的映射
    const tagNameToId = {};
    insertedTags.forEach(tag => {
      tagNameToId[tag.name] = tag.id;
    });

    // 4. 插入问题数据
    console.log('插入问题数据...');
    const allQuestions = [];
    const allQuestionTags = [];

    questionBankData.categories.forEach(category => {
      category.questions.forEach(question => {
        // 添加问题
        allQuestions.push({
          id: question.id,
          category_id: category.id,
          title: question.title,
          content: question.content,
          difficulty: question.difficulty,
          created_at: question.createdAt ? new Date(question.createdAt).toISOString() : new Date().toISOString()
        });

        // 添加问题标签关联
        question.tags.forEach(tagName => {
          if (tagNameToId[tagName]) {
            allQuestionTags.push({
              question_id: question.id,
              tag_id: tagNameToId[tagName]
            });
          }
        });
      });
    });

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(allQuestions);

    if (questionsError) {
      throw new Error(`插入问题失败: ${questionsError.message}`);
    }
    console.log(`成功插入 ${allQuestions.length} 个问题`);

    // 5. 插入问题标签关联
    console.log('插入问题标签关联...');
    const { error: questionTagsError } = await supabase
      .from('question_tags')
      .insert(allQuestionTags);

    if (questionTagsError) {
      throw new Error(`插入问题标签关联失败: ${questionTagsError.message}`);
    }
    console.log(`成功插入 ${allQuestionTags.length} 个问题标签关联`);

    console.log('数据迁移完成！');

    // 6. 验证数据
    console.log('验证迁移结果...');
    const { data: categoriesCount } = await supabase
      .from('question_categories')
      .select('*', { count: 'exact', head: true });
    
    const { data: questionsCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });

    const { data: tagsCount } = await supabase
      .from('tags')
      .select('*', { count: 'exact', head: true });

    console.log(`验证结果:`);
    console.log(`- 分类数量: ${categoriesCount?.length || 0}`);
    console.log(`- 问题数量: ${questionsCount?.length || 0}`);
    console.log(`- 标签数量: ${tagsCount?.length || 0}`);

  } catch (error) {
    console.error('迁移失败:', error.message);
    process.exit(1);
  }
}

// 执行迁移
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData };
