/**
 * GPT 提示词模板管理
 */

// 基础 Lean 转换提示词
export const LEAN_CONVERSION_PROMPT = `你是一个专业的 Lean 4 数学证明助手。请将用户的自然语言问题转换为 Lean 4 代码。

用户问题: {question}

请按照以下格式回复:
1. 首先分析问题的数学本质
2. 定义相关的常数和函数
3. 写出要证明的定理
4. 提供证明思路（可以使用 sorry 作为占位符）

请确保生成的 Lean 代码符合 Lean 4 语法，包含必要的 import 语句。

示例格式:
\`\`\`lean
import Mathlib.Analysis.SpecialFunctions.Exp
import Mathlib.Data.Real.Basic

-- 常数定义
def v : ℝ := 0.01  -- 流速 (m/yr)

-- 函数定义
def concentration (t : ℝ) : ℝ := c0 * Real.exp (-λ * t / R)

-- 定理
theorem main_theorem : concentration 10000 ≤ 0.015 := by
  sorry
\`\`\`

注意事项:
- 使用 Lean 4 语法 (Real.exp 而不是 real.exp)
- 包含适当的 import 语句
- 提供清晰的注释
- 使用合理的变量名`;

// 地球化学专用提示词
export const GEOCHEMISTRY_PROMPT = `你是一个专业的地球化学建模和 Lean 4 证明助手。专门处理与地下水、核素迁移、化学反应相关的问题。

用户问题: {question}

请分析这个地球化学问题并转换为 Lean 4 代码:

1. **问题分析**: 识别涉及的物理/化学过程
2. **参数定义**: 定义相关的物理常数和初始条件
3. **数学建模**: 建立微分方程或代数方程
4. **Lean 实现**: 转换为 Lean 4 代码
5. **验证目标**: 明确要证明的性质

常见的地球化学参数:
- 流速 (v): m/yr
- 衰变常数 (λ): 1/yr  
- 滞留因子 (R): 无量纲
- 浓度 (c): mg/L
- 扩散系数 (D): m²/yr
- 吸附系数 (Kd): L/kg

请生成符合 Lean 4 语法的代码:
\`\`\`lean
import Mathlib.Analysis.SpecialFunctions.Exp
import Mathlib.Data.Real.Basic
import Mathlib.Analysis.Calculus.FDeriv.Basic

-- 物理参数定义
def v : ℝ := 0.01       -- 流速
def λ : ℝ := 1e-5       -- 衰变常数
def R : ℝ := 1.2        -- 滞留因子

-- 建模函数
def concentration (t : ℝ) : ℝ := ...

-- 要证明的定理
theorem safety_bound : ∀ t ∈ Set.Icc 0 10000, concentration t ≤ threshold := by
  sorry
\`\`\``;

// 数值计算验证提示词
export const NUMERICAL_VERIFICATION_PROMPT = `请为以下 Lean 代码提供数值验证和计算辅助:

Lean 代码:
{leanCode}

请提供:
1. **数值计算**: 计算关键数值结果
2. **边界检查**: 验证是否满足安全限值
3. **敏感性分析**: 分析参数变化的影响
4. **物理解释**: 解释结果的物理意义

请使用 Python 代码进行数值验证:
\`\`\`python
import numpy as np
import matplotlib.pyplot as plt

# 参数定义
v = 0.01
lambda_decay = 1e-5
R = 1.2
c0 = 0.1

# 浓度函数
def concentration(t):
    return c0 * np.exp(-lambda_decay * t / R)

# 验证计算
t_target = 10000
c_result = concentration(t_target)
print(f"在 {t_target} 年时的浓度: {c_result:.6f} mg/L")
\`\`\``;

// 错误修复提示词
export const ERROR_FIXING_PROMPT = `以下 Lean 代码存在错误，请帮助修复:

错误的 Lean 代码:
{leanCode}

错误信息:
{errorMessage}

请提供:
1. **错误分析**: 解释错误的原因
2. **修复方案**: 提供正确的代码
3. **语法说明**: 解释正确的 Lean 4 语法
4. **最佳实践**: 避免类似错误的建议

修复后的代码应该:
- 符合 Lean 4 语法规范
- 包含正确的 import 语句
- 使用适当的类型注解
- 提供清晰的注释`;

// 交互式问答提示词
export const INTERACTIVE_QA_PROMPT = `基于之前的对话历史，回答用户的后续问题:

对话历史:
{conversationHistory}

当前问题: {question}

请提供:
1. **上下文理解**: 基于之前的讨论
2. **问题回答**: 直接回答用户问题
3. **代码更新**: 如需要，更新 Lean 代码
4. **进一步探索**: 建议相关的后续问题

如果问题涉及参数变化或假设情况，请:
- 修改相应的 Lean 定义
- 重新分析数学模型
- 提供新的证明目标`;

/**
 * 根据问题类型选择合适的提示词模板
 * @param {string} questionType - 问题类型
 * @param {Object} context - 上下文信息
 * @returns {string} 格式化的提示词
 */
export function getPromptTemplate(questionType, context = {}) {
  const templates = {
    'lean_conversion': LEAN_CONVERSION_PROMPT,
    'geochemistry': GEOCHEMISTRY_PROMPT,
    'numerical_verification': NUMERICAL_VERIFICATION_PROMPT,
    'error_fixing': ERROR_FIXING_PROMPT,
    'interactive_qa': INTERACTIVE_QA_PROMPT
  };
  
  let template = templates[questionType] || LEAN_CONVERSION_PROMPT;
  
  // 替换模板中的占位符
  Object.keys(context).forEach(key => {
    const placeholder = `{${key}}`;
    template = template.replace(new RegExp(placeholder, 'g'), context[key] || '');
  });
  
  return template;
}

/**
 * 检测问题类型
 * @param {string} question - 用户问题
 * @param {Array} conversationHistory - 对话历史
 * @returns {string} 问题类型
 */
export function detectQuestionType(question, conversationHistory = []) {
  const lowerQuestion = question.toLowerCase();
  
  // 检查是否是交互式问答
  if (conversationHistory.length > 0) {
    if (lowerQuestion.includes('如果') || lowerQuestion.includes('假设') || 
        lowerQuestion.includes('那么') || lowerQuestion.includes('会怎样')) {
      return 'interactive_qa';
    }
  }
  
  // 检查是否是地球化学相关
  const geochemKeywords = ['浓度', '流速', '衰变', '核素', '地下水', '迁移', '吸附', '扩散'];
  if (geochemKeywords.some(keyword => lowerQuestion.includes(keyword))) {
    return 'geochemistry';
  }
  
  // 检查是否是数值验证
  if (lowerQuestion.includes('计算') || lowerQuestion.includes('验证') || 
      lowerQuestion.includes('数值') || lowerQuestion.includes('结果')) {
    return 'numerical_verification';
  }
  
  // 默认为 Lean 转换
  return 'lean_conversion';
}

/**
 * 格式化对话历史
 * @param {Array} messages - 消息数组
 * @returns {string} 格式化的对话历史
 */
export function formatConversationHistory(messages) {
  return messages.map((msg, index) => {
    const role = msg.role === 'user' ? '用户' : '助手';
    return `${index + 1}. ${role}: ${msg.text}`;
  }).join('\n\n');
}
