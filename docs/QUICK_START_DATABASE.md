# LeanAtom 数据库快速开始指南

本指南将帮助您快速将 LeanAtom 项目部署到 Netlify 并使用 Supabase 数据库。

## 🚀 快速部署步骤

### 1. 创建 Supabase 项目 (5 分钟)

1. 访问 [supabase.com](https://supabase.com) 并注册账户
2. 点击 "New Project"
3. 填写项目信息：
   - Name: `leanatom`
   - Database Password: 设置强密码
   - Region: 选择最近的区域
4. 等待项目创建完成（约 2-3 分钟）

### 2. 获取数据库配置 (2 分钟)

在 Supabase 项目 Dashboard 中：

1. 点击左侧 "Settings" → "API"
2. 复制以下信息：
   - Project URL: `https://xxxxx.supabase.co`
   - `anon` `public` key
   - `service_role` `secret` key

### 3. 创建数据库表 (3 分钟)

1. 在 Supabase Dashboard 中，点击左侧 "SQL Editor"
2. 点击 "New query"
3. 复制粘贴以下 SQL 代码并执行：

```sql
-- 创建问题分类表
CREATE TABLE IF NOT EXISTS question_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建问题表
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(50) PRIMARY KEY,
    category_id VARCHAR(50) NOT NULL REFERENCES question_categories(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建标签表
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建问题标签关联表
CREATE TABLE IF NOT EXISTS question_tags (
    question_id VARCHAR(50) REFERENCES questions(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, tag_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

-- 启用行级安全策略
ALTER TABLE question_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;

-- 创建公共读取策略
CREATE POLICY "Allow public read access on question_categories" 
    ON question_categories FOR SELECT USING (true);

CREATE POLICY "Allow public read access on questions" 
    ON questions FOR SELECT USING (true);

CREATE POLICY "Allow public read access on tags" 
    ON tags FOR SELECT USING (true);

CREATE POLICY "Allow public read access on question_tags" 
    ON question_tags FOR SELECT USING (true);
```

### 4. 配置 Netlify 环境变量 (3 分钟)

1. 登录 [Netlify](https://netlify.com)
2. 连接您的 GitHub 仓库 `https://github.com/baoqj/leanatom`
3. 在站点设置中，进入 "Environment variables"
4. 添加以下环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
USE_DATABASE=true
LLM_PROVIDER=huggingface
HUGGINGFACE_API_KEY=your_huggingface_api_key
ENABLE_LEAN_VERIFICATION=false
```

### 5. 部署应用 (2 分钟)

1. 在 Netlify 中点击 "Deploy site"
2. 等待构建完成
3. 构建过程中会自动初始化数据库数据

### 6. 验证部署 (1 分钟)

访问您的 Netlify 站点 URL，检查：
- ✅ 页面正常加载
- ✅ 问题库显示分类
- ✅ 搜索功能正常
- ✅ 问题详情可以查看

## 🔧 本地开发设置

如果您想在本地开发：

### 1. 克隆项目

```bash
git clone https://github.com/baoqj/leanatom.git
cd leanatom
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，添加您的 Supabase 配置。

### 4. 初始化数据库数据

```bash
npm run db:setup
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 📊 数据管理

### 添加更多问题数据

您可以通过以下方式添加更多问题：

1. **通过界面**: 使用应用的问题管理功能
2. **通过脚本**: 修改 `scripts/setup-database.js` 添加更多初始数据
3. **通过 SQL**: 直接在 Supabase SQL Editor 中插入数据

### 数据备份

在 Supabase Dashboard 中：
1. 进入 "Settings" → "Database"
2. 点击 "Database backups"
3. 可以手动创建备份或设置自动备份

## 🚨 故障排除

### 常见问题

**问题**: 页面显示 "服务器内部错误"
**解决**: 检查 Netlify 的 Functions 日志，确认环境变量配置正确

**问题**: 问题库为空
**解决**: 检查数据库表是否创建成功，运行 `npm run db:setup` 初始化数据

**问题**: 搜索功能不工作
**解决**: 确认 Supabase RLS 策略已正确设置

### 获取帮助

1. 查看 Netlify 构建日志
2. 查看 Supabase 项目日志
3. 检查浏览器控制台错误信息

## 💰 成本说明

- **Supabase 免费层**: 500MB 数据库，足够存储数千个问题
- **Netlify 免费层**: 100GB 带宽/月，对于个人使用完全足够
- **总成本**: 免费！

## 🎯 下一步

部署成功后，您可以：

1. 自定义问题分类和内容
2. 添加更多地球化学问题
3. 集成 Lean 4 证明验证
4. 添加用户认证系统
5. 实现协作功能

恭喜！您已经成功部署了 LeanAtom 到生产环境！🎉
