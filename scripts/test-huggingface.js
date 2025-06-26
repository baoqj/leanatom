#!/usr/bin/env node

/**
 * Hugging Face API 测试脚本
 * 测试 LeanAtom 的 Hugging Face 集成
 */

const HuggingFaceClient = require('../lib/huggingfaceClient.js');

async function testHuggingFace() {
  console.log('🧪 测试 Hugging Face API 集成...\n');

  // 检查环境变量
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey || apiKey.startsWith('your_')) {
    console.error('❌ 错误: HUGGINGFACE_API_KEY 未配置');
    console.log('请在 .env.local 中设置您的 Hugging Face API Key');
    process.exit(1);
  }

  console.log('✅ API Key 已配置');

  try {
    // 创建客户端
    const client = new HuggingFaceClient(apiKey);
    console.log(`📡 使用模型: ${client.model}`);

    // 检查模型状态
    console.log('\n🔍 检查模型状态...');
    const status = await client.checkModelStatus();
    console.log('状态:', status);

    if (!status.available) {
      console.log('⚠️  模型当前不可用，可能正在加载中...');
      console.log('💡 提示: Hugging Face 模型首次使用时需要加载时间');
      return;
    }

    // 测试简单对话
    console.log('\n💬 测试简单对话...');
    const messages = [
      {
        role: 'system',
        content: '你是一个专业的数学助手。'
      },
      {
        role: 'user',
        content: '请简单解释什么是微分方程。'
      }
    ];

    console.log('发送消息:', messages[1].content);
    const response = await client.generateText(messages, {
      maxTokens: 200,
      temperature: 0.3
    });

    console.log('\n📝 AI 响应:');
    console.log(response);

    // 测试地球化学问题
    console.log('\n🧪 测试地球化学问题...');
    const geoMessages = [
      {
        role: 'system',
        content: '你是一个专业的 Lean 4 数学证明助手，专门帮助用户将自然语言问题转换为 Lean 代码，特别擅长地球化学和环境科学建模。'
      },
      {
        role: 'user',
        content: '请建立一个描述铀浓度随时间衰变的数学模型，并用 Lean 4 代码表示。'
      }
    ];

    console.log('发送地球化学问题...');
    const geoResponse = await client.generateText(geoMessages, {
      maxTokens: 1000,
      temperature: 0.3
    });

    console.log('\n🔬 地球化学模型响应:');
    console.log(geoResponse.substring(0, 500) + '...');

    console.log('\n✅ Hugging Face API 测试完成！');
    console.log('🎉 集成工作正常，可以在 LeanAtom 中使用');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    
    if (error.message.includes('503')) {
      console.log('💡 提示: 模型可能正在加载中，请稍后重试');
    } else if (error.message.includes('401')) {
      console.log('💡 提示: API Key 可能无效，请检查配置');
    } else if (error.message.includes('429')) {
      console.log('💡 提示: API 调用频率限制，请稍后重试');
    }
  }
}

// 运行测试
if (require.main === module) {
  // 加载环境变量
  require('dotenv').config({ path: '.env.local' });
  testHuggingFace();
}

module.exports = testHuggingFace;
