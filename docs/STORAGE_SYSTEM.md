# 📁 LeanAtom 存储系统使用指南

## 🎯 概述

LeanAtom 项目现在支持灵活的存储系统架构，可以在文件存储和数据库存储之间无缝切换。本文档详细说明如何使用存储系统、分离数据和代码，以及将数据导入数据库。

## 🏗️ 架构设计

### 存储抽象层
- **StorageInterface**: 定义统一的存储接口
- **FileStorage**: 文件存储实现 (JSON)
- **DatabaseStorage**: 数据库存储实现 (Supabase)
- **StorageManager**: 存储管理器，自动选择存储类型

### 数据分离
- **代码与数据分离**: 将 `questionBank.js` 中的代码和数据完全分离
- **纯数据文件**: `questionBankData.json` 包含所有问题库数据
- **纯代码文件**: `questionBankCode.js` 包含所有数据操作逻辑

## 🚀 快速开始

### 1. 分离现有数据

```bash
# 分离 questionBank.js 中的代码和数据
npm run data:separate
```

这个命令会：
- 从 `questionBank.js` 提取数据到 `questionBankData.json`
- 创建纯代码文件 `questionBankCode.js`
- 备份原始文件为 `questionBank.js.backup`
- 更新 `questionBank.js` 为模块化版本

### 2. 配置存储类型

通过环境变量控制存储类型：

```bash
# 使用文件存储 (默认)
USE_DATABASE=false

# 使用数据库存储
USE_DATABASE=true
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### 3. 导入数据到数据库

```bash
# 将分离的数据导入到数据库
npm run data:import
```

这个命令会：
- 连接到 Supabase 数据库
- 读取 `questionBankData.json` 或 `questionBank.js`
- 创建所有分类、问题和标签
- 生成导入报告

## 📊 存储系统管理

### 健康检查

```bash
# 检查存储系统健康状态
npm run storage:health
```

### 统计信息

```bash
# 获取存储系统统计信息
npm run storage:stats
```

## 🔧 API 使用

### 基本用法

```javascript
import { getStorageManager } from '../lib/storage/StorageManager.js';

// 获取存储管理器 (自动选择存储类型)
const storageManager = await getStorageManager();

// 获取所有分类
const categories = await storageManager.getAllCategories();

// 搜索问题
const results = await storageManager.searchQuestions('铀', {
  difficulty: 'medium',
  tags: ['地下水']
});
```

### 高级用法

```javascript
import { StorageManager } from '../lib/storage/StorageManager.js';

// 手动指定存储类型
const manager = new StorageManager();
await manager.initialize({
  type: 'database', // 或 'file'
  cacheEnabled: true,
  cacheTimeout: 300000
});

// 数据迁移
const result = await manager.migrateFromFileToDatabase();
console.log('迁移结果:', result);
```

## 📁 文件结构

```
lib/storage/
├── StorageInterface.js     # 存储接口定义
├── FileStorage.js          # 文件存储实现
├── DatabaseStorage.js      # 数据库存储实现
└── StorageManager.js       # 存储管理器

data/
├── questionBank.js         # 模块化入口文件
├── questionBank.js.backup  # 原始文件备份
├── questionBankData.json   # 纯数据文件
├── questionBankCode.js     # 纯代码文件
└── import-report.json      # 导入报告

scripts/
├── separate-data.js        # 数据分离脚本
└── import-to-database.js   # 数据导入脚本
```

## 🔄 数据迁移流程

### 从文件到数据库

1. **准备环境**
   ```bash
   # 设置数据库环境变量
   export USE_DATABASE=true
   export NEXT_PUBLIC_SUPABASE_URL=your_url
   export NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

2. **分离数据** (如果还没有分离)
   ```bash
   npm run data:separate
   ```

3. **导入数据**
   ```bash
   npm run data:import
   ```

4. **验证结果**
   ```bash
   npm run storage:health
   npm run storage:stats
   ```

### 从数据库到文件

```javascript
import { getStorageManager } from '../lib/storage/StorageManager.js';

const manager = await getStorageManager({ type: 'database' });
const data = await manager.exportData();

// 保存到文件
import fs from 'fs/promises';
await fs.writeFile('exported-data.json', JSON.stringify(data, null, 2));
```

## 🛠️ 开发指南

### 添加新的存储后端

1. 继承 `StorageInterface` 类
2. 实现所有抽象方法
3. 在 `StorageManager` 中注册新类型

```javascript
import { StorageInterface } from './StorageInterface.js';

export class MyStorage extends StorageInterface {
  async getAllCategories() {
    // 实现获取分类逻辑
  }
  
  // 实现其他方法...
}
```

### 数据验证

存储系统内置数据验证：

```javascript
import { DataValidator, StorageConfig } from './StorageInterface.js';

const validation = DataValidator.validate(categoryData, StorageConfig.VALIDATION_RULES.category);
if (!validation.isValid) {
  console.error('验证失败:', validation.errors);
}
```

## 🚨 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查环境变量配置
   - 验证 Supabase URL 和密钥
   - 运行 `npm run storage:health`

2. **数据导入失败**
   - 检查数据文件格式
   - 确认数据库表结构
   - 查看导入报告

3. **缓存问题**
   - 清除应用缓存
   - 重启开发服务器
   - 检查缓存配置

### 调试模式

```bash
# 启用详细日志
DEBUG=storage:* npm run dev
```

## 📈 性能优化

### 缓存策略
- 默认启用 5 分钟缓存
- 可通过配置调整缓存时间
- 支持手动清除缓存

### 批量操作
```javascript
// 批量创建问题
const questions = [...];
for (const question of questions) {
  await storageManager.createQuestion(question);
}
```

## 🔐 安全考虑

- 数据库连接使用环境变量
- 支持 Row Level Security (RLS)
- 输入数据验证和清理
- 错误信息不暴露敏感信息

## 📚 相关文档

- [数据库设计文档](./DATABASE_SCHEMA.md)
- [API 接口文档](./API_REFERENCE.md)
- [部署指南](./DEPLOYMENT.md)
- [Vercel 部署指南](./VERCEL_DEPLOYMENT.md)
