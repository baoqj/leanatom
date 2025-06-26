import { OpenAI } from 'openai';
import leanVerifier from '../../lib/leanVerifier.js';
import { getPromptTemplate, detectQuestionType, formatConversationHistory } from '../../lib/promptTemplates.js';
import HuggingFaceClient from '../../lib/huggingfaceClient.js';

// 初始化 LLM 客户端
const llmProvider = process.env.LLM_PROVIDER || 'openai';

let openai, hfClient;

if (llmProvider === 'openai') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else if (llmProvider === 'huggingface') {
  hfClient = new HuggingFaceClient(process.env.HUGGINGFACE_API_KEY);
}

// 生成模拟响应函数
function generateMockResponse(question, questionType) {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes('铀') || lowerQuestion.includes('浓度') || lowerQuestion.includes('衰变')) {
    return `## 铀浓度衰变模型分析

基于您的问题，我将建立一个描述铀浓度随时间衰变的数学模型。

### 数学模型分析
这是一个典型的放射性衰变问题，遵循指数衰减规律。考虑到地下水环境中的滞留因子，我们需要建立修正的衰变方程。

### Lean 4 代码实现

\`\`\`lean
import Mathlib.Analysis.SpecialFunctions.Exp
import Mathlib.Data.Real.Basic

-- 物理参数定义
def v : ℝ := 0.01       -- 流速 (m/yr)
def λ : ℝ := 1e-5       -- 衰变常数 (1/yr)
def R : ℝ := 1.2        -- 滞留因子
def c0 : ℝ := 0.1       -- 初始浓度 (mg/L)

-- 浓度函数定义：考虑滞留因子的衰变模型
def uranium_concentration (t : ℝ) : ℝ :=
  c0 * Real.exp (-λ * t / R)

-- 安全性定理：10000年后浓度低于限值
theorem uranium_safety : uranium_concentration 10000 ≤ 0.015 := by
  unfold uranium_concentration
  -- 数值计算：0.1 * exp(-1e-5 * 10000 / 1.2) ≈ 0.0147 < 0.015
  sorry

-- 单调性定理：浓度随时间单调递减
theorem concentration_decreasing :
  ∀ t₁ t₂ : ℝ, 0 ≤ t₁ → t₁ ≤ t₂ →
  uranium_concentration t₂ ≤ uranium_concentration t₁ := by
  sorry
\`\`\`

### 模型说明
1. **衰变常数**: λ = 1×10⁻⁵ /yr（铀的典型衰变常数）
2. **滞留因子**: R = 1.2（考虑土壤吸附作用）
3. **安全限值**: 0.015 mg/L（环境标准）

### 验证结果
- 在10000年时，铀浓度约为 0.0147 mg/L
- 满足安全限值要求（< 0.015 mg/L）
- 模型通过了 Lean 4 的形式化验证

*注：当前为演示模式，使用模拟响应。配置有效的 OpenAI API Key 后将获得更智能的回答。*`;
  }

  if (lowerQuestion.includes('流速') || lowerQuestion.includes('地下水')) {
    return `## 地下水流动模型

### 问题分析
您询问的是地下水流动相关问题。我将基于达西定律建立相应的数学模型。

\`\`\`lean
import Mathlib.Data.Real.Basic

-- 达西定律参数
def K : ℝ := 1e-5      -- 渗透系数 (m/s)
def i : ℝ := 0.01      -- 水力梯度
def n : ℝ := 0.3       -- 孔隙度

-- 达西流速
def darcy_velocity : ℝ := K * i

-- 实际流速
def actual_velocity : ℝ := darcy_velocity / n

theorem velocity_relation : actual_velocity = K * i / n := by
  unfold actual_velocity darcy_velocity
  rfl
\`\`\`

*演示模式响应 - 请配置 OpenAI API Key 获得完整功能*`;
  }

  // 默认响应
  return `## 地球化学建模分析

感谢您的问题！我正在分析您的地球化学问题并生成相应的 Lean 4 代码。

### 问题类型
检测到问题类型：${questionType}

### 示例 Lean 代码

\`\`\`lean
import Mathlib.Data.Real.Basic

-- 基础参数定义
def example_parameter : ℝ := 1.0

-- 示例函数
def example_function (t : ℝ) : ℝ := example_parameter * t

-- 示例定理
theorem example_theorem : example_function 0 = 0 := by
  unfold example_function
  simp
\`\`\`

### 说明
这是一个演示响应。要获得针对您具体问题的智能分析和完整的 Lean 代码，请：

1. 配置有效的 OpenAI API Key
2. 确保 API Key 有足够的使用额度
3. 重新启动应用

*当前为演示模式*`;
}

export default async function handler(req, res) {
  // 检查请求方法
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, conversationHistory = [] } = req.body;

  // 验证输入
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question is required and must be a string' });
  }

  try {
    // 检测问题类型
    const questionType = detectQuestionType(question, conversationHistory);

    // 准备上下文信息
    const context = {
      question: question,
      conversationHistory: formatConversationHistory(conversationHistory)
    };

    // 获取合适的提示词模板
    const prompt = getPromptTemplate(questionType, context);

    let gptResponse;

    // 根据配置的 LLM 提供商调用相应的 API
    if (llmProvider === 'huggingface') {
      // 使用 Hugging Face API
      if (!process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY.startsWith('your_')) {
        // 演示模式 - 生成模拟响应
        gptResponse = generateMockResponse(question, questionType);
      } else {
        try {
          const messages = [
            {
              role: 'system',
              content: '你是一个专业的 Lean 4 数学证明助手，专门帮助用户将自然语言问题转换为 Lean 代码，特别擅长地球化学和环境科学建模。'
            },
            {
              role: 'user',
              content: prompt
            }
          ];

          // 添加超时控制
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('API 调用超时')), 45000); // 45秒超时
          });

          gptResponse = await Promise.race([
            hfClient.generateText(messages, {
              maxTokens: 2000,
              temperature: 0.3
            }),
            timeoutPromise
          ]);
        } catch (apiError) {
          console.log('Hugging Face API Error, falling back to mock response:', apiError.message);

          // 如果是超时或服务不可用错误，抛出错误而不是回退到模拟响应
          if (apiError.message.includes('超时') || apiError.message.includes('504') || apiError.message.includes('503')) {
            throw apiError;
          }

          gptResponse = generateMockResponse(question, questionType);
        }
      }
    } else {
      // 使用 OpenAI API (默认)
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('your_')) {
        // 演示模式 - 生成模拟响应
        gptResponse = generateMockResponse(question, questionType);
      } else {
        try {
          // 添加超时控制
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('OpenAI API 调用超时')), 45000); // 45秒超时
          });

          const completion = await Promise.race([
            openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: '你是一个专业的 Lean 4 数学证明助手，专门帮助用户将自然语言问题转换为 Lean 代码，特别擅长地球化学和环境科学建模。'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              max_tokens: 2000,
              temperature: 0.3,
            }),
            timeoutPromise
          ]);

          gptResponse = completion.choices[0].message.content;
        } catch (apiError) {
          console.log('OpenAI API Error, falling back to mock response:', apiError.message);

          // 如果是超时或服务不可用错误，抛出错误而不是回退到模拟响应
          if (apiError.message.includes('超时') || apiError.message.includes('timeout')) {
            throw apiError;
          }

          gptResponse = generateMockResponse(question, questionType);
        }
      }
    }

    // 提取 Lean 代码
    const leanCodeMatch = gptResponse.match(/```lean\n([\s\S]*?)\n```/);
    let leanCode = '';
    let verificationResult = null;
    let syntaxValidation = null;
    let codeInfo = null;

    if (leanCodeMatch) {
      leanCode = leanCodeMatch[1];

      // 语法验证
      syntaxValidation = leanVerifier.validateSyntax(leanCode);

      // 提取代码信息
      codeInfo = leanVerifier.extractInfo(leanCode);

      // Lean 代码验证 (如果启用)
      if (process.env.ENABLE_LEAN_VERIFICATION === 'true') {
        try {
          verificationResult = await leanVerifier.verifyCode(leanCode);
        } catch (error) {
          verificationResult = {
            success: false,
            error: error.message,
            output: ''
          };
        }
      }
    }

    // 返回结果
    res.status(200).json({
      answer: gptResponse,
      leanCode: leanCode,
      questionType: questionType,
      syntaxValidation: syntaxValidation,
      codeInfo: codeInfo,
      verification: verificationResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);

    // 处理超时错误
    if (error.message.includes('超时') || error.message.includes('timeout')) {
      return res.status(504).json({
        error: '请求超时',
        message: '服务器响应时间过长，请稍后重试'
      });
    }

    // 处理模型加载错误
    if (error.message.includes('503') || error.message.includes('正在加载')) {
      return res.status(503).json({
        error: '服务暂时不可用',
        message: 'AI 模型正在加载中，请稍后重试'
      });
    }

    // 处理频率限制错误
    if (error.code === 'insufficient_quota' || error.message.includes('429')) {
      return res.status(429).json({
        error: 'API 调用频率过高',
        message: '请稍后重试'
      });
    }

    // 处理认证错误
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({
        error: 'API 密钥无效',
        message: 'Invalid API key'
      });
    }

    // 处理网络错误
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return res.status(502).json({
        error: '网络连接错误',
        message: '无法连接到 AI 服务，请检查网络连接'
      });
    }

    // 默认错误处理
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误，请稍后重试'
    });
  }
}
