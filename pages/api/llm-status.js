/**
 * LLM API 状态检查端点
 * 检查当前配置的 LLM 提供商状态
 */

import { OpenAI } from 'openai';
import HuggingFaceClient from '../../lib/huggingfaceClient.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const llmProvider = process.env.LLM_PROVIDER || 'openai';
    const status = {
      provider: llmProvider,
      timestamp: new Date().toISOString(),
      available: false,
      details: {}
    };

    if (llmProvider === 'huggingface') {
      // 检查 Hugging Face API
      const apiKey = process.env.HUGGINGFACE_API_KEY;
      
      if (!apiKey || apiKey.startsWith('your_')) {
        status.details = {
          error: 'Hugging Face API key not configured',
          configured: false
        };
      } else {
        try {
          const hfClient = new HuggingFaceClient(apiKey);
          const modelStatus = await hfClient.checkModelStatus();
          
          status.available = modelStatus.available;
          status.details = {
            configured: true,
            model: modelStatus.model,
            modelInfo: modelStatus.modelInfo,
            status: modelStatus.status,
            error: modelStatus.error
          };
        } catch (error) {
          status.details = {
            configured: true,
            error: error.message
          };
        }
      }
    } else {
      // 检查 OpenAI API
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey || apiKey.startsWith('your_')) {
        status.details = {
          error: 'OpenAI API key not configured',
          configured: false
        };
      } else {
        try {
          const openai = new OpenAI({ apiKey });
          
          // 尝试一个简单的 API 调用
          const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 5
          });
          
          status.available = true;
          status.details = {
            configured: true,
            model: 'gpt-3.5-turbo',
            response: completion.choices[0].message.content
          };
        } catch (error) {
          status.details = {
            configured: true,
            error: error.message,
            errorCode: error.code
          };
        }
      }
    }

    // 添加可用模型信息
    if (llmProvider === 'huggingface') {
      status.availableModels = HuggingFaceClient.getAvailableModels();
    }

    res.status(200).json(status);
  } catch (error) {
    console.error('LLM Status Check Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
