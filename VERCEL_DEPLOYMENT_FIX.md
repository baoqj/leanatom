# Vercel 部署修复指南

## 🚨 问题描述

部署到 Vercel 后，问题库为空，没有问题组和问题，添加分类时出现验证错误。

## 🔍 问题原因

1. **数据库为空**：Vercel 部署的是新环境，没有导入初始数据
2. **环境变量配置**：可能缺少必要的环境变量

## ✅ 解决方案

### 步骤 1: 确认环境变量配置

在 Vercel 项目设置中确保以下环境变量已正确配置：

```bash
# 必需的环境变量
USE_DATABASE=true
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
HUGGINGFACE_API_KEY=your_huggingface_api_key
LLM_PROVIDER=huggingface
```

> **⚠️ 重要**: 请使用您自己的实际 API 密钥和数据库连接信息。

### 步骤 2: 导入初始数据

我们已经创建了数据导入脚本 `scripts/deploy-import-data.js`，包含：

- ✅ 8 个问题分类
- ✅ 3 个示例问题  
- ✅ 9 个标签
- ✅ 问题-标签关联

**本地已验证数据导入成功**：
```
📊 导入统计:
   - 分类: 8 个
   - 问题: 3 个
   - 标签: 9 个
   - 关联: 9 个
```

### 步骤 3: 验证部署

部署完成后，访问您的 Vercel 应用并检查：

1. **问题库加载**：左侧应显示 8 个问题分类
2. **添加功能**：测试"➕ 添加问题组"和"➕ 增加问题"功能
3. **数据显示**：点击分类应显示对应的问题

### 步骤 4: 手动数据导入（如果需要）

如果自动导入失败，可以通过以下方式手动导入：

1. **使用 Supabase 控制台**：
   - 访问 https://supabase.com/dashboard
   - 进入您的项目
   - 使用 SQL 编辑器执行数据插入

2. **使用 API 端点**：
   ```bash
   # 添加分类示例
   curl -X POST https://your-app.vercel.app/api/question-bank \
     -H "Content-Type: application/json" \
     -d '{
       "action": "addCategory",
       "category": {
         "name": "铀衰变与放射性",
         "description": "铀系衰变链、放射性衰变常数、半衰期计算等相关问题"
       }
     }'
   ```

## 🔧 故障排除

### 问题 1: "分类数据验证失败: 字段 id 是必填的"

**原因**：验证逻辑错误或环境变量配置问题

**解决方案**：
1. 检查 Vercel 环境变量配置
2. 确认 `USE_DATABASE=true`
3. 重新部署应用

### 问题 2: 问题库显示为空

**原因**：数据库连接问题或数据未导入

**解决方案**：
1. 检查 Supabase 数据库连接
2. 验证环境变量配置
3. 手动导入数据

### 问题 3: API 调用失败

**原因**：环境变量缺失或数据库权限问题

**解决方案**：
1. 检查所有必需的环境变量
2. 验证 Supabase 服务密钥权限
3. 查看 Vercel 函数日志

## 📞 技术支持

如果问题仍然存在，请提供：

1. **Vercel 部署日志**
2. **浏览器控制台错误信息**
3. **具体的错误消息**
4. **环境变量配置截图**（隐藏敏感信息）

## 🎯 预期结果

修复完成后，您应该看到：

- ✅ 问题库左侧显示 8 个分类
- ✅ 点击分类显示对应问题
- ✅ "添加问题组"功能正常工作
- ✅ "增加问题"功能正常工作
- ✅ 聊天功能使用 Hugging Face API 正常工作

---

**最后更新**: 2025-06-26
**状态**: 本地验证通过，等待 Vercel 部署验证
