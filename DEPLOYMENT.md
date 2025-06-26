# LeanAtom 部署指南

## 🚀 Vercel 部署步骤

### 1. GitHub 代码更新 ✅
最新代码已推送到: https://github.com/baoqj/leanatom

### 2. Vercel 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

#### 🔑 必需的环境变量

```bash
# LLM API 配置
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
LLM_PROVIDER=huggingface

# Supabase 数据库配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 数据库连接配置
POSTGRES_URL=your_postgres_connection_string
POSTGRES_PRISMA_URL=your_postgres_prisma_connection_string

# 应用配置
USE_DATABASE=true
ENABLE_LEAN_VERIFICATION=false
NODE_ENV=production
```

> **⚠️ 重要提示**: 请使用您自己的实际API密钥和数据库连接信息替换上述占位符。

#### 🔧 可选的环境变量

```bash
# OpenAI API (备用)
OPENAI_API_KEY=your_openai_api_key_here

# 应用信息
NEXT_PUBLIC_APP_NAME=LeanAtom
NEXT_PUBLIC_APP_VERSION=1.0.0

# API 配置
API_RATE_LIMIT=100
API_TIMEOUT=30000
```

### 3. 部署验证

部署完成后，验证以下功能：

- ✅ 主页加载正常
- ✅ 问题库显示正常（从 Supabase 数据库加载）
- ✅ 添加问题组功能
- ✅ 增加问题功能
- ✅ 聊天功能（使用 Hugging Face API）

### 4. 最新功能

本次更新包含：

- 🔧 修复了添加问题组和增加问题的功能
- 🛡️ 改进了数据验证逻辑
- 🎯 优化了前端错误处理
- 📊 完善了 Supabase 数据库集成
- 🚀 提升了用户体验

### 5. 故障排除

如果遇到问题：

1. **检查环境变量**: 确保所有必需的环境变量都已正确设置
2. **查看构建日志**: 检查 Vercel 构建过程中是否有错误
3. **验证数据库连接**: 确认 Supabase 数据库可以正常访问
4. **检查 API 密钥**: 验证 Hugging Face API 密钥是否有效

## 📝 更新日志

### v1.2.0 (2025-06-26)
- 修复添加问题组和增加问题功能
- 完善数据验证和错误处理
- 优化 Supabase 数据库集成
- 提升前端用户体验

### v1.1.0 (之前版本)
- 集成 Supabase 数据库
- 实现完整的 CRUD 功能
- 添加问题库管理系统
