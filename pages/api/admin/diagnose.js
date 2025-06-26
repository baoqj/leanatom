// 环境诊断API
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只允许 GET 请求' });
  }

  try {
    // 检查环境变量
    const envCheck = {
      USE_DATABASE: !!process.env.USE_DATABASE,
      USE_DATABASE_VALUE: process.env.USE_DATABASE,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      HUGGINGFACE_API_KEY: !!process.env.HUGGINGFACE_API_KEY,
      LLM_PROVIDER: process.env.LLM_PROVIDER,
      NODE_ENV: process.env.NODE_ENV
    };

    // 尝试获取存储管理器
    let storageManagerStatus = 'unknown';
    let storageType = 'unknown';
    let connectionTest = 'failed';
    
    try {
      const { getStorageManager } = require('../../../lib/storage/StorageManager.js');
      const storageManager = await getStorageManager();
      storageManagerStatus = 'success';
      storageType = storageManager.constructor.name;
      
      // 测试数据库连接
      try {
        const healthCheck = await storageManager.healthCheck();
        connectionTest = healthCheck.status || 'unknown';
      } catch (healthError) {
        connectionTest = `health_check_failed: ${healthError.message}`;
      }
    } catch (managerError) {
      storageManagerStatus = `failed: ${managerError.message}`;
    }

    // 测试添加分类
    let addCategoryTest = 'not_tested';
    if (storageManagerStatus === 'success') {
      try {
        const { getStorageManager } = require('../../../lib/storage/StorageManager.js');
        const storageManager = await getStorageManager();
        
        const testCategory = {
          name: `诊断测试分类_${Date.now()}`,
          description: '这是一个诊断测试分类，用于验证添加功能'
        };
        
        const result = await storageManager.createCategory(testCategory);
        addCategoryTest = `success: ${result.id}`;
      } catch (addError) {
        addCategoryTest = `failed: ${addError.message}`;
      }
    }

    res.status(200).json({
      timestamp: new Date().toISOString(),
      environment: {
        ...envCheck
      },
      storage: {
        managerStatus: storageManagerStatus,
        type: storageType,
        connectionTest,
        addCategoryTest
      },
      deployment: {
        platform: 'vercel',
        region: process.env.VERCEL_REGION || 'unknown',
        url: process.env.VERCEL_URL || 'unknown'
      }
    });

  } catch (error) {
    res.status(500).json({
      error: '诊断失败',
      details: error.message,
      stack: error.stack
    });
  }
}
