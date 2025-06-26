#!/usr/bin/env node

// 数据库状态检查工具
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 环境变量');
  console.log('请设置以下环境变量:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('🔍 检查数据库状态...\n');

  try {
    // 检查连接
    console.log('1. 检查数据库连接...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('question_categories')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      console.log('❌ 数据库连接失败:', connectionError.message);
      return;
    }
    console.log('✅ 数据库连接正常\n');

    // 检查表结构
    console.log('2. 检查表结构...');
    const tables = ['question_categories', 'questions', 'tags', 'question_tags'];
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ 表 ${table} 不存在或有问题:`, error.message);
        } else {
          console.log(`✅ 表 ${table} 存在`);
        }
      } catch (err) {
        console.log(`❌ 检查表 ${table} 时出错:`, err.message);
      }
    }
    console.log('');

    // 检查数据统计
    console.log('3. 数据统计...');
    
    // 分类统计
    const { count: categoriesCount, error: categoriesError } = await supabase
      .from('question_categories')
      .select('*', { count: 'exact', head: true });
    
    if (!categoriesError) {
      console.log(`📁 问题分类: ${categoriesCount} 个`);
    }

    // 问题统计
    const { count: questionsCount, error: questionsError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });
    
    if (!questionsError) {
      console.log(`❓ 问题总数: ${questionsCount} 个`);
    }

    // 标签统计
    const { count: tagsCount, error: tagsError } = await supabase
      .from('tags')
      .select('*', { count: 'exact', head: true });
    
    if (!tagsError) {
      console.log(`🏷️  标签总数: ${tagsCount} 个`);
    }

    // 难度分布
    const { data: difficultyStats, error: difficultyError } = await supabase
      .from('questions')
      .select('difficulty')
      .not('difficulty', 'is', null);

    if (!difficultyError && difficultyStats) {
      const difficultyCount = difficultyStats.reduce((acc, item) => {
        acc[item.difficulty] = (acc[item.difficulty] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📊 难度分布:');
      Object.entries(difficultyCount).forEach(([difficulty, count]) => {
        const emoji = difficulty === 'easy' ? '🟢' : difficulty === 'medium' ? '🟡' : '🔴';
        console.log(`   ${emoji} ${difficulty}: ${count} 个`);
      });
    }

    console.log('');

    // 检查最新数据
    console.log('4. 最新数据...');
    const { data: latestQuestions, error: latestError } = await supabase
      .from('questions')
      .select('title, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (!latestError && latestQuestions) {
      console.log('📝 最新问题:');
      latestQuestions.forEach((question, index) => {
        const date = new Date(question.created_at).toLocaleDateString();
        console.log(`   ${index + 1}. ${question.title} (${date})`);
      });
    }

    console.log('');

    // 检查 RLS 策略
    console.log('5. 检查访问权限...');
    try {
      // 使用匿名密钥测试读取权限
      const anonSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
      const { data: publicData, error: publicError } = await anonSupabase
        .from('question_categories')
        .select('id, name')
        .limit(1);

      if (publicError) {
        console.log('❌ 公共读取权限有问题:', publicError.message);
      } else {
        console.log('✅ 公共读取权限正常');
      }
    } catch (err) {
      console.log('⚠️  无法测试公共访问权限 (可能缺少 ANON_KEY)');
    }

    console.log('\n🎉 数据库检查完成！');

  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkDatabase();
}

module.exports = { checkDatabase };
