#!/usr/bin/env node

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

// 数据导入脚本 - 将分离的数据导入到数据库
const { getStorageManager } = require('../lib/storage/StorageManager.js');
const fs = require('fs/promises');
const path = require('path');

async function importToDatabase() {
  console.log('🚀 开始将数据导入数据库...\n');

  try {
    // 1. 初始化存储管理器 (强制使用数据库)
    console.log('📡 连接数据库...');
    const storageManager = await getStorageManager({
      type: 'database'
    });

    // 2. 健康检查
    const health = await storageManager.healthCheck();
    if (health.status !== 'healthy') {
      throw new Error(`数据库不健康: ${health.error || '未知错误'}`);
    }
    console.log('✅ 数据库连接正常');

    // 3. 读取数据文件
    console.log('📖 读取数据文件...');
    
    // 优先读取分离后的 JSON 文件
    let dataPath = path.join(process.cwd(), 'data', 'questionBankData.json');
    let data;
    
    try {
      const content = await fs.readFile(dataPath, 'utf8');
      data = JSON.parse(content);
      console.log(`✅ 从 ${dataPath} 读取数据成功`);
    } catch (error) {
      // 如果 JSON 文件不存在，尝试从原始 JS 文件读取
      console.log('JSON 文件不存在，尝试从原始 questionBank.js 读取...');
      
      const jsPath = path.join(process.cwd(), 'data', 'questionBank.js');
      const jsContent = await fs.readFile(jsPath, 'utf8');
      
      // 提取数据部分
      const dataMatch = jsContent.match(/export const initialQuestionBank = ({[\s\S]*?});/);
      if (!dataMatch) {
        throw new Error('无法从 questionBank.js 中提取数据');
      }
      
      data = eval(`(${dataMatch[1]})`);
      console.log(`✅ 从 ${jsPath} 提取数据成功`);
    }

    // 4. 验证数据结构
    if (!data || !data.categories || !Array.isArray(data.categories)) {
      throw new Error('数据结构无效：缺少 categories 数组');
    }

    console.log(`📊 数据统计: ${data.categories.length} 个分类`);

    // 5. 收集所有标签
    console.log('🏷️  收集标签...');
    const allTags = new Set();
    let totalQuestions = 0;

    data.categories.forEach(category => {
      if (category.questions) {
        totalQuestions += category.questions.length;
        category.questions.forEach(question => {
          if (question.tags) {
            question.tags.forEach(tag => allTags.add(tag));
          }
        });
      }
    });

    console.log(`📊 完整统计: ${data.categories.length} 个分类, ${totalQuestions} 个问题, ${allTags.size} 个标签`);

    // 6. 检查是否已有数据
    const existingCategories = await storageManager.getAllCategories();
    if (existingCategories.length > 0) {
      console.log(`⚠️  数据库中已有 ${existingCategories.length} 个分类`);
      console.log('如果继续，将跳过已存在的数据');
    }

    // 7. 导入数据
    console.log('\n🔄 开始导入数据...');

    // 导入分类和问题
    let importedCategories = 0;
    let importedQuestions = 0;
    let skippedCategories = 0;

    for (const category of data.categories) {
      try {
        // 检查分类是否已存在
        const existingCategory = await storageManager.getCategoryById(category.id);
        
        if (existingCategory) {
          console.log(`⏭️  跳过已存在的分类: ${category.name}`);
          skippedCategories++;
        } else {
          // 创建分类
          await storageManager.createCategory({
            id: category.id,
            name: category.name,
            description: category.description || null
          });

          console.log(`✅ 创建分类: ${category.name}`);
          importedCategories++;
        }

        // 导入该分类下的问题（无论分类是否已存在）
        if (category.questions && category.questions.length > 0) {
          for (const question of category.questions) {
            try {
              // 检查问题是否已存在
              const existingQuestion = await storageManager.getQuestionById(question.id);
              
              if (existingQuestion) {
                console.log(`   ⏭️  跳过已存在的问题: ${question.title}`);
                continue;
              }

              // 创建问题 (如果存储支持)
              if (storageManager.createQuestion) {
                await storageManager.createQuestion({
                  id: question.id,
                  categoryId: category.id,
                  title: question.title,
                  content: question.content,
                  difficulty: question.difficulty || null,
                  tags: question.tags || []
                });

                console.log(`   ✅ 创建问题: ${question.title}`);
                importedQuestions++;
              }
            } catch (questionError) {
              console.warn(`   ⚠️  创建问题失败 ${question.id}: ${questionError.message}`);
            }
          }
        }

      } catch (categoryError) {
        console.warn(`⚠️  创建分类失败 ${category.id}: ${categoryError.message}`);
      }
    }

    // 8. 导入结果统计
    console.log('\n📊 导入结果统计:');
    console.log(`✅ 成功导入分类: ${importedCategories} 个`);
    console.log(`✅ 成功导入问题: ${importedQuestions} 个`);
    console.log(`⏭️  跳过分类: ${skippedCategories} 个`);

    // 9. 验证导入结果
    console.log('\n🔍 验证导入结果...');
    const finalStats = await storageManager.getStatistics();
    console.log('数据库最终统计:', finalStats);

    // 10. 创建导入报告
    const report = {
      timestamp: new Date().toISOString(),
      source: {
        categoriesCount: data.categories.length,
        questionsCount: totalQuestions,
        tagsCount: allTags.size
      },
      imported: {
        categoriesCount: importedCategories,
        questionsCount: importedQuestions
      },
      skipped: {
        categoriesCount: skippedCategories
      },
      final: finalStats
    };

    const reportPath = path.join(process.cwd(), 'data', 'import-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`📄 导入报告已保存: ${reportPath}`);

    console.log('\n🎉 数据导入完成！');
    
    return report;

  } catch (error) {
    console.error('❌ 数据导入失败:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  importToDatabase()
    .then(report => {
      console.log('\n✅ 导入脚本执行成功');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 导入脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { importToDatabase };
