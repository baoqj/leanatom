# LeanAtom 数据库部署指南

本指南将帮助您将 LeanAtom 项目从本地文件存储迁移到 Supabase 数据库，并部署到 Netlify 平台。

## 方案概述

我们提供了完整的数据库迁移方案，将原本存储在 `data/` 目录中的 JSON 文件数据迁移到 Supabase PostgreSQL 数据库中。

### 数据库架构

- **question_categories**: 问题分类表
- **questions**: 问题表
- **tags**: 标签表
- **question_tags**: 问题标签关联表

## 步骤 1: 设置 Supabase 数据库

### 1.1 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com)
2. 创建新账户或登录
3. 点击 "New Project"
4. 填写项目信息：
   - Name: `leanatom-db`
   - Organization: 选择您的组织
   - Database Password: 设置强密码
   - Region: 选择离您最近的区域

### 1.2 获取数据库连接信息

项目创建完成后，在项目设置中获取：
- Project URL: `https://your-project-id.supabase.co`
- API Keys:
  - `anon` key (公开密钥)
  - `service_role` key (服务角色密钥，用于数据迁移)

### 1.3 创建数据库表结构

1. 在 Supabase Dashboard 中，进入 "SQL Editor"
2. 复制 `database/schema.sql` 文件内容
3. 执行 SQL 脚本创建表结构

## 步骤 2: 配置环境变量

### 2.1 本地开发环境

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，添加 Supabase 配置：

```env
# Supabase 数据库配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 启用数据库模式
USE_DATABASE=true
```

### 2.2 安装 Supabase 客户端

```bash
npm install @supabase/supabase-js
```

## 步骤 3: 数据迁移

### 3.1 执行数据迁移脚本

```bash
node database/migrate.js
```

这个脚本将：
1. 读取 `data/questionBankData.json` 文件
2. 将分类数据插入到 `question_categories` 表
3. 将标签数据插入到 `tags` 表
4. 将问题数据插入到 `questions` 表
5. 建立问题与标签的关联关系

### 3.2 验证数据迁移

在 Supabase Dashboard 的 Table Editor 中检查：
- `question_categories` 表应包含 8 个分类
- `questions` 表应包含所有问题
- `tags` 表应包含所有唯一标签
- `question_tags` 表应包含问题标签关联

## 步骤 4: 更新应用代码

### 4.1 切换到数据库 API

修改前端代码，将 API 调用从 `/api/question-bank` 改为 `/api/question-bank-db`：

在 `components/QuestionBankSidebar.js` 中：

```javascript
// 原来的调用
const response = await fetch('/api/question-bank?action=categories');

// 改为
const response = await fetch('/api/question-bank-db?action=categories');
```

### 4.2 测试本地功能

```bash
npm run dev
```

访问 http://localhost:3000 测试所有功能：
- 分类列表加载
- 问题搜索
- 标签过滤
- CRUD 操作

## 步骤 5: 部署到 Netlify

### 5.1 配置 Netlify 环境变量

在 Netlify Dashboard 中：

1. 进入您的站点设置
2. 选择 "Environment variables"
3. 添加以下变量：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
USE_DATABASE=true
LLM_PROVIDER=huggingface
HUGGINGFACE_API_KEY=your_huggingface_api_key
ENABLE_LEAN_VERIFICATION=false
```

### 5.2 更新构建配置

确保 `netlify.toml` 文件包含正确的构建配置：

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### 5.3 部署应用

推送代码到 GitHub，Netlify 将自动部署：

```bash
git add .
git commit -m "Add Supabase database integration"
git push origin main
```

## 步骤 6: 验证部署

### 6.1 检查部署状态

在 Netlify Dashboard 中检查部署日志，确保没有错误。

### 6.2 测试生产环境

访问您的 Netlify 站点 URL，测试：
- 问题库加载
- 搜索功能
- 标签过滤
- 响应速度

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 Supabase URL 和 API 密钥是否正确
   - 确认 Supabase 项目状态正常

2. **数据迁移失败**
   - 检查 `database/migrate.js` 中的环境变量
   - 确认有足够的数据库权限

3. **API 调用失败**
   - 检查 RLS (Row Level Security) 策略
   - 确认 API 路由正确

4. **Netlify 部署失败**
   - 检查环境变量配置
   - 查看构建日志中的错误信息

### 性能优化

1. **数据库索引**: 已在 schema.sql 中创建必要索引
2. **查询优化**: 使用 Supabase 的查询优化功能
3. **缓存策略**: 考虑添加 Redis 缓存层

## 备份与恢复

### 数据备份

```bash
# 导出数据库
supabase db dump --file backup.sql

# 或使用 pg_dump
pg_dump "postgresql://user:pass@host:port/dbname" > backup.sql
```

### 数据恢复

```bash
# 恢复数据库
psql "postgresql://user:pass@host:port/dbname" < backup.sql
```

## 监控与维护

1. **Supabase Dashboard**: 监控数据库性能和使用情况
2. **Netlify Analytics**: 监控应用访问情况
3. **错误日志**: 定期检查应用错误日志
4. **数据备份**: 定期备份数据库数据

## 成本估算

### Supabase 费用
- 免费层: 500MB 数据库存储，50MB 文件存储
- Pro 层: $25/月，8GB 数据库存储，100GB 文件存储

### Netlify 费用
- 免费层: 100GB 带宽/月，300 分钟构建时间/月
- Pro 层: $19/月，1TB 带宽/月，25,000 分钟构建时间/月

对于 LeanAtom 项目，免费层通常足够使用。
