/**
 * Hugging Face API 客户端
 * 支持多种开源 LLM 模型
 */

// 推荐的开源模型列表
const RECOMMENDED_MODELS = {
  // 中文友好的模型
  'Qwen/Qwen2.5-72B-Instruct': {
    name: 'Qwen2.5-72B-Instruct',
    description: '阿里巴巴的强大中文模型，支持数学和代码生成',
    maxTokens: 4096,
    temperature: 0.3
  },
  'microsoft/DialoGPT-large': {
    name: 'DialoGPT-Large',
    description: '微软的对话模型',
    maxTokens: 2048,
    temperature: 0.7
  },
  'meta-llama/Llama-2-70b-chat-hf': {
    name: 'Llama-2-70B-Chat',
    description: 'Meta 的 Llama 2 聊天模型',
    maxTokens: 4096,
    temperature: 0.3
  },
  'mistralai/Mixtral-8x7B-Instruct-v0.1': {
    name: 'Mixtral-8x7B-Instruct',
    description: 'Mistral AI 的混合专家模型',
    maxTokens: 4096,
    temperature: 0.3
  }
};

// 默认使用的模型
const DEFAULT_MODEL = 'Qwen/Qwen2.5-72B-Instruct';

class HuggingFaceClient {
  constructor(apiKey, model = DEFAULT_MODEL) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://api-inference.huggingface.co/models';
    this.modelConfig = RECOMMENDED_MODELS[model] || RECOMMENDED_MODELS[DEFAULT_MODEL];
  }

  /**
   * 调用 Hugging Face Inference API
   */
  async generateText(messages, options = {}) {
    const {
      maxTokens = this.modelConfig.maxTokens,
      temperature = this.modelConfig.temperature,
      topP = 0.9,
      repetitionPenalty = 1.1
    } = options;

    // 将消息格式转换为适合 HF 的格式
    const prompt = this.formatMessages(messages);

    const requestBody = {
      inputs: prompt,
      parameters: {
        max_new_tokens: maxTokens,
        temperature: temperature,
        top_p: topP,
        repetition_penalty: repetitionPenalty,
        do_sample: true,
        return_full_text: false
      },
      options: {
        wait_for_model: true,
        use_cache: false
      }
    };

    try {
      // 创建 AbortController 用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch(`${this.baseUrl}/${this.model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();

        // 处理特定的错误状态码
        if (response.status === 503) {
          throw new Error(`模型正在加载中，请稍后重试 (${response.status})`);
        } else if (response.status === 504) {
          throw new Error(`请求超时，模型响应时间过长 (${response.status})`);
        } else if (response.status === 429) {
          throw new Error(`API 调用频率过高，请稍后重试 (${response.status})`);
        } else {
          throw new Error(`HuggingFace API 错误: ${response.status} - ${errorText}`);
        }
      }

      const result = await response.json();
      
      // 处理不同的响应格式
      if (Array.isArray(result) && result.length > 0) {
        return result[0].generated_text || result[0].text || '';
      } else if (result.generated_text) {
        return result.generated_text;
      } else {
        throw new Error('Unexpected response format from HuggingFace API');
      }

    } catch (error) {
      console.error('HuggingFace API Error:', error);

      // 处理超时错误
      if (error.name === 'AbortError') {
        throw new Error('请求超时，模型响应时间过长，请稍后重试');
      }

      // 处理网络错误
      if (error.message.includes('fetch')) {
        throw new Error('网络连接错误，请检查网络连接后重试');
      }

      throw error;
    }
  }

  /**
   * 将 OpenAI 格式的消息转换为 HuggingFace 格式的提示词
   */
  formatMessages(messages) {
    let prompt = '';
    
    for (const message of messages) {
      switch (message.role) {
        case 'system':
          prompt += `<|system|>\n${message.content}\n\n`;
          break;
        case 'user':
          prompt += `<|user|>\n${message.content}\n\n`;
          break;
        case 'assistant':
          prompt += `<|assistant|>\n${message.content}\n\n`;
          break;
        default:
          prompt += `${message.content}\n\n`;
      }
    }
    
    // 添加助手开始标记
    prompt += '<|assistant|>\n';
    
    return prompt;
  }

  /**
   * 检查模型是否可用
   */
  async checkModelStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/${this.model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: "Hello",
          parameters: { max_new_tokens: 10 }
        })
      });

      return {
        available: response.ok,
        status: response.status,
        model: this.model,
        modelInfo: this.modelConfig
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        model: this.model
      };
    }
  }

  /**
   * 获取可用模型列表
   */
  static getAvailableModels() {
    return RECOMMENDED_MODELS;
  }

  /**
   * 切换模型
   */
  switchModel(newModel) {
    if (RECOMMENDED_MODELS[newModel]) {
      this.model = newModel;
      this.modelConfig = RECOMMENDED_MODELS[newModel];
      return true;
    }
    return false;
  }
}

module.exports = HuggingFaceClient;
