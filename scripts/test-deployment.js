#!/usr/bin/env node

// 部署测试脚本
const https = require('https');
const http = require('http');

// 测试 URL 列表
const testUrls = [
  '/api/health',
  '/api/question-bank?action=categories',
  '/api/question-bank-db?action=categories',
  '/api/lean-gpt',
];

function testUrl(baseUrl, path) {
  return new Promise((resolve) => {
    const url = `${baseUrl}${path}`;
    const client = baseUrl.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          success: res.statusCode < 400,
          data: data.substring(0, 100) + (data.length > 100 ? '...' : '')
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        path,
        status: 0,
        success: false,
        error: error.message
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        path,
        status: 0,
        success: false,
        error: 'Timeout'
      });
    });
  });
}

async function testDeployment(baseUrl) {
  console.log(`🧪 测试部署: ${baseUrl}\n`);
  
  const results = [];
  
  for (const path of testUrls) {
    console.log(`测试 ${path}...`);
    const result = await testUrl(baseUrl, path);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${path} - 状态: ${result.status}`);
    } else {
      console.log(`❌ ${path} - 错误: ${result.error || result.status}`);
    }
  }
  
  console.log('\n📊 测试结果汇总:');
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`成功: ${successful}/${total}`);
  
  if (successful === total) {
    console.log('🎉 所有测试通过！部署成功！');
  } else {
    console.log('⚠️  部分测试失败，请检查配置');
  }
  
  return results;
}

// 命令行使用
if (require.main === module) {
  const baseUrl = process.argv[2];
  
  if (!baseUrl) {
    console.log('使用方法: node scripts/test-deployment.js <base-url>');
    console.log('示例: node scripts/test-deployment.js https://your-app.vercel.app');
    process.exit(1);
  }
  
  testDeployment(baseUrl)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('测试失败:', error);
      process.exit(1);
    });
}

module.exports = { testDeployment };
