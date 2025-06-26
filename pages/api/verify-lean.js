import leanVerifier from '../../lib/leanVerifier.js';

/**
 * API 端点：验证 Lean 代码
 * POST /api/verify-lean
 */
export default async function handler(req, res) {
  // 检查请求方法
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { leanCode, filename } = req.body;

  // 验证输入
  if (!leanCode || typeof leanCode !== 'string') {
    return res.status(400).json({ error: 'Lean code is required and must be a string' });
  }

  try {
    // 语法验证
    const syntaxValidation = leanVerifier.validateSyntax(leanCode);
    
    // 提取代码信息
    const codeInfo = leanVerifier.extractInfo(leanCode);
    
    let verificationResult = null;
    
    // 如果启用了 Lean 验证，则进行完整验证
    if (process.env.ENABLE_LEAN_VERIFICATION === 'true') {
      try {
        verificationResult = await leanVerifier.verifyCode(leanCode, filename);
      } catch (error) {
        verificationResult = {
          success: false,
          error: error.message,
          output: '',
          hasErrors: true,
          hasWarnings: false,
          executionTime: Date.now()
        };
      }
    }

    // 返回验证结果
    res.status(200).json({
      syntaxValidation,
      codeInfo,
      verification: verificationResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Verification Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Verification failed'
    });
  }
}
