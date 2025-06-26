# LeanAtom Vercel 部署指南

本指南将帮助您将 LeanAtom 项目部署到 Vercel 平台。

## 🚀 快速部署

### 方案一：使用 Supabase 数据库 (推荐)

#### 1. 准备 Supabase 数据库

1. 访问 [supabase.com](https://supabase.com) 创建项目
2. 在 SQL Editor 中执行 `database/schema.sql` 创建表结构
3. 获取项目配置信息：
   - Project URL: `https://xxxxx.supabase.co`
   - `anon` key (公开密钥)
   - `service_role` key (服务密钥)

#### 2. 部署到 Vercel

1. **连接 GitHub 仓库**
   - 访问 [vercel.com](https://vercel.com)
   - 点击 "New Project"
   - 选择 GitHub 仓库: `https://github.com/baoqj/leanatom`

2. **配置环境变量**
   在 Vercel 项目设置中添加以下环境变量：

   ```env
   # 数据库配置
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   USE_DATABASE=true

   # LLM 配置 (选择其一)
   LLM_PROVIDER=huggingface
   HUGGINGFACE_API_KEY=your_huggingface_token

   # 或者使用 OpenAI
   # LLM_PROVIDER=openai
   # OPENAI_API_KEY=your_openai_key

   # 其他配置
   ENABLE_LEAN_VERIFICATION=false
   ```

3. **部署**
   - 点击 "Deploy"
   - 等待构建完成
   - 访问生成的 URL

#### 3. 初始化数据库数据

部署完成后，访问以下 URL 初始化数据库：
```
https://your-app.vercel.app/api/question-bank-db?action=setup
```

或者在本地运行：
```bash
npm run db:setup
```

### 方案二：使用文件存储 (传统方式)

如果不想使用数据库，可以继续使用文件存储：

```env
# LLM 配置
LLM_PROVIDER=huggingface
HUGGINGFACE_API_KEY=your_huggingface_token

# 禁用数据库
USE_DATABASE=false

# 其他配置
ENABLE_LEAN_VERIFICATION=false
```

## 🔧 配置说明

### vercel.json 配置

项目已包含优化的 `vercel.json` 配置：

```json
{
  "name": "leanatom",
  "env": {
    "LLM_PROVIDER": "@llm-provider",
    "HUGGINGFACE_API_KEY": "@huggingface-api-key",
    "OPENAI_API_KEY": "@openai-api-key",
    "ENABLE_LEAN_VERIFICATION": "@enable-lean-verification",
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key",
    "USE_DATABASE": "@use-database"
  },
  "functions": {
    "pages/api/lean-gpt.js": {
      "maxDuration": 30
    },
    "pages/api/verify-lean.js": {
      "maxDuration": 30
    },
    "pages/api/question-bank-db.js": {
      "maxDuration": 10
    }
  }
}
```

### 环境变量映射

在 Vercel 项目设置中，环境变量名称应该对应：

| Vercel 环境变量名 | 对应的 Secret 名称 |
|------------------|-------------------|
| `LLM_PROVIDER` | `@llm-provider` |
| `HUGGINGFACE_API_KEY` | `@huggingface-api-key` |
| `OPENAI_API_KEY` | `@openai-api-key` |
| `NEXT_PUBLIC_SUPABASE_URL` | `@supabase-url` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `@supabase-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `@supabase-service-key` |
| `USE_DATABASE` | `@use-database` |

## 🚨 常见问题

### 1. "functions property cannot be used in conjunction with builds"

**问题**: Vercel 显示 builds 和 functions 冲突错误

**解决**: 已修复 `vercel.json`，移除了 `builds` 属性。Vercel 会自动检测 Next.js 项目。

### 2. 数据库连接失败

**问题**: API 调用返回数据库连接错误

**解决**: 
- 检查 Supabase 环境变量是否正确设置
- 确认 Supabase 项目状态正常
- 检查 RLS 策略是否正确配置

### 3. API 超时

**问题**: API 请求超时

**解决**: 
- 检查 `vercel.json` 中的 `maxDuration` 设置
- 优化数据库查询性能
- 考虑使用缓存

### 4. 静态文件访问问题

**问题**: 图片或静态文件无法加载

**解决**: 
- 检查 `next.config.js` 中的 `images` 配置
- 确认文件路径正确
- 使用相对路径而非绝对路径

## 📊 性能优化

### 1. 数据库优化

- 使用数据库索引加速查询
- 实现查询结果缓存
- 优化 SQL 查询语句

### 2. API 优化

- 启用 API 路由缓存
- 使用 SWR 进行客户端缓存
- 实现请求去重

### 3. 前端优化

- 启用 Next.js 图片优化
- 使用动态导入减少包大小
- 实现懒加载

## 🔍 监控和调试

### 1. Vercel Analytics

在 Vercel Dashboard 中查看：
- 部署状态和日志
- 函数执行时间
- 错误率统计

### 2. 数据库监控

在 Supabase Dashboard 中查看：
- 数据库性能指标
- 查询执行计划
- 连接数统计

### 3. 日志调试

```javascript
// 在 API 路由中添加日志
console.log('API Request:', req.method, req.url);
console.error('Error:', error.message);
```

## 🎯 部署检查清单

- [ ] Supabase 项目已创建
- [ ] 数据库表结构已创建
- [ ] Vercel 环境变量已配置
- [ ] GitHub 仓库已连接
- [ ] 部署成功完成
- [ ] 数据库数据已初始化
- [ ] 所有功能测试通过
- [ ] 性能指标正常

## 📞 获取帮助

如果遇到问题：

1. 查看 Vercel 部署日志
2. 检查 Supabase 项目状态
3. 查看浏览器控制台错误
4. 参考 [Vercel 文档](https://vercel.com/docs)
5. 参考 [Supabase 文档](https://supabase.com/docs)

恭喜！您已成功将 LeanAtom 部署到 Vercel！🎉
