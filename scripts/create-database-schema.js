#!/usr/bin/env node

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

// 数据库表结构创建脚本
const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ 缺少 Supabase 配置');
  console.log('需要设置以下环境变量:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SQL 创建表的语句
const createTablesSQL = `
-- 创建问题分类表
CREATE TABLE IF NOT EXISTS question_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建问题表
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES question_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建标签表
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建问题标签关联表
CREATE TABLE IF NOT EXISTS question_tags (
  question_id TEXT REFERENCES questions(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, tag_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);
CREATE INDEX IF NOT EXISTS idx_question_tags_question_id ON question_tags(question_id);
CREATE INDEX IF NOT EXISTS idx_question_tags_tag_id ON question_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为表添加更新时间触发器
DROP TRIGGER IF EXISTS update_question_categories_updated_at ON question_categories;
CREATE TRIGGER update_question_categories_updated_at
    BEFORE UPDATE ON question_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
`;

async function createDatabaseSchema() {
  console.log('🚀 开始创建数据库表结构...\n');

  try {
    console.log('📡 连接到 Supabase 数据库...');
    console.log(`🔗 URL: ${supabaseUrl}`);

    // 使用 Supabase REST API 创建表
    console.log('📋 使用 REST API 创建数据库表...');

    // 尝试创建表 - 使用 Supabase 的 SQL 编辑器 API
    const createTableQueries = [
      // 创建问题分类表
      `CREATE TABLE IF NOT EXISTS question_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // 创建问题表
      `CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // 创建标签表
      `CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // 创建问题标签关联表
      `CREATE TABLE IF NOT EXISTS question_tags (
        question_id TEXT,
        tag_id INTEGER,
        PRIMARY KEY (question_id, tag_id)
      )`
    ];

    // 尝试通过 REST API 执行 SQL
    for (let i = 0; i < createTableQueries.length; i++) {
      const query = createTableQueries[i];
      console.log(`创建表 ${i + 1}/4...`);

      try {
        // 使用 rpc 调用执行 SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql: query });
        if (error) {
          console.log(`⚠️  表 ${i + 1} 创建可能失败: ${error.message}`);
        } else {
          console.log(`✅ 表 ${i + 1} 创建成功`);
        }
      } catch (err) {
        console.log(`⚠️  表 ${i + 1} 创建异常: ${err.message}`);
      }
    }

    console.log('\n📋 如果上述方法失败，请手动在 Supabase 控制台中执行以下 SQL:');
    console.log('\n' + '='.repeat(60));
    console.log(createTablesSQL);
    console.log('='.repeat(60) + '\n');

    // 验证表是否创建成功
    console.log('🔍 验证表结构...');
    
    const tables = ['question_categories', 'questions', 'tags', 'question_tags'];
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ 表 ${table} 不存在或无法访问: ${error.message}`);
        } else {
          console.log(`✅ 表 ${table} 创建成功`);
        }
      } catch (err) {
        console.log(`❌ 验证表 ${table} 时出错: ${err.message}`);
      }
    }

    console.log('\n🎉 数据库表结构设置完成！');
    console.log('\n📋 创建的表:');
    console.log('- question_categories (问题分类)');
    console.log('- questions (问题)');
    console.log('- tags (标签)');
    console.log('- question_tags (问题标签关联)');
    
    console.log('\n🔧 下一步: 运行 npm run data:import 导入数据');

  } catch (error) {
    console.error('❌ 数据库表结构创建失败:', error.message);
    console.log('\n🛠️  请手动在 Supabase 控制台中执行以下 SQL:');
    console.log('\n' + '='.repeat(60));
    console.log(createTablesSQL);
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// 运行脚本
createDatabaseSchema().catch(console.error);
