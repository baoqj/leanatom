/**
 * API 测试文件
 */

import { createMocks } from 'node-mocks-http';
import leanGptHandler from '../pages/api/lean-gpt';
import verifyLeanHandler from '../pages/api/verify-lean';

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: `这是一个地球化学问题的分析：

\`\`\`lean
import Mathlib.Data.Real.Basic

def test_concentration (t : ℝ) : ℝ := 0.1 * Real.exp (-1e-5 * t)

theorem test_theorem : test_concentration 0 = 0.1 := by
  unfold test_concentration
  simp
\`\`\`

这个模型描述了核素的衰变过程。`
            }
          }]
        })
      }
    }
  }))
}));

describe('/api/lean-gpt', () => {
  test('应该处理有效的问题请求', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        question: '建立一个简单的核素衰变模型',
        conversationHistory: []
      }
    });

    await leanGptHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('answer');
    expect(data).toHaveProperty('leanCode');
    expect(data).toHaveProperty('questionType');
    expect(data.leanCode).toContain('test_concentration');
  });

  test('应该拒绝无效的请求方法', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    });

    await leanGptHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error', 'Method not allowed');
  });

  test('应该验证必需的参数', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {}
    });

    await leanGptHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error');
  });
});

describe('/api/verify-lean', () => {
  test('应该验证 Lean 代码语法', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        leanCode: `import Mathlib.Data.Real.Basic

def test_function (x : ℝ) : ℝ := x + 1

theorem test_theorem : test_function 0 = 1 := by
  unfold test_function
  simp`
      }
    });

    await verifyLeanHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('syntaxValidation');
    expect(data).toHaveProperty('codeInfo');
    expect(data.syntaxValidation.valid).toBe(true);
    expect(data.codeInfo.theorems).toContain('test_theorem');
    expect(data.codeInfo.definitions).toContain('test_function');
  });

  test('应该检测语法错误', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        leanCode: `def invalid_syntax ( : ℝ := 1` // 故意的语法错误
      }
    });

    await verifyLeanHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    expect(data.syntaxValidation.valid).toBe(false);
    expect(data.syntaxValidation.issues.length).toBeGreaterThan(0);
  });
});

// 集成测试
describe('完整工作流程', () => {
  test('应该能够处理完整的问答流程', async () => {
    // 1. 发送问题
    const { req: req1, res: res1 } = createMocks({
      method: 'POST',
      body: {
        question: '请建立一个描述铀浓度随时间变化的数学模型',
        conversationHistory: []
      }
    });

    await leanGptHandler(req1, res1);
    expect(res1._getStatusCode()).toBe(200);
    
    const response1 = JSON.parse(res1._getData());
    expect(response1.leanCode).toBeTruthy();

    // 2. 验证生成的代码
    const { req: req2, res: res2 } = createMocks({
      method: 'POST',
      body: {
        leanCode: response1.leanCode
      }
    });

    await verifyLeanHandler(req2, res2);
    expect(res2._getStatusCode()).toBe(200);
    
    const response2 = JSON.parse(res2._getData());
    expect(response2.syntaxValidation).toBeTruthy();
  });
});
