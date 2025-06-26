# Vercel 生产环境修复指南

## 🚨 **当前问题状态**

**诊断结果**（来自 `/api/admin/diagnose`）：
- ❌ `USE_DATABASE: false` - **这是主要问题**
- ✅ 其他环境变量配置正确
- ❌ 仍有验证错误："字段 id 是必填的"

## 🔧 **完整解决方案**

### **步骤1: 设置 Vercel 环境变量**

1. **访问 Vercel 控制台**：
   - 登录 [Vercel Dashboard](https://vercel.com/dashboard)
   - 选择 `leanatom` 项目

2. **配置环境变量**：
   - 进入 **Settings** → **Environment Variables**
   - 确保以下变量都已设置：

   ```bash
   USE_DATABASE=true
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   HUGGINGFACE_API_KEY=your_huggingface_api_key
   LLM_PROVIDER=huggingface
   ```

   > **⚠️ 重要**: 请使用您自己的实际 API 密钥和数据库连接信息。

3. **重新部署**：
   - 设置完环境变量后，点击 **Redeploy** 按钮
   - 或者推送任何代码更改触发自动部署

### **步骤2: 验证修复效果**

等待部署完成后（约2-3分钟），测试以下内容：

1. **检查诊断API**：
   ```bash
   curl https://leanatom.vercel.app/api/admin/diagnose
   ```
   
   **期望结果**：
   ```json
   {
     "environment": {
       "USE_DATABASE": true,  // 应该是 true
       ...
     },
     "storage": {
       "addCategoryTest": "success: xxx"  // 应该成功
     }
   }
   ```

2. **导入初始数据**：
   ```bash
   curl -X POST https://leanatom.vercel.app/api/admin/import-data
   ```
   
   **期望结果**：
   ```json
   {
     "success": true,
     "imported": {
       "categories": 8,
       "questions": 5
     }
   }
   ```

3. **验证问题库**：
   - 访问 https://leanatom.vercel.app
   - 检查左侧问题库是否显示8个分类
   - 测试"➕ 添加问题组"功能

### **步骤3: 使用可视化导入工具**

如果命令行不方便，可以使用网页界面：

1. **访问管理页面**：
   https://leanatom.vercel.app/admin/import

2. **点击"开始导入数据"**

3. **查看导入结果**

## 🔄 **已实施的代码修复**

### **修复1: 简化验证逻辑**
- ✅ 移除复杂的 `DataValidator` 调用
- ✅ 直接验证必要字段，避免 ID 验证错误
- ✅ 提供更清晰的错误信息

### **修复2: 强制生产环境使用数据库**
- ✅ 生产环境自动使用数据库存储
- ✅ 添加详细的环境检查日志
- ✅ 确保 Vercel 部署使用正确的存储类型

### **修复3: 自动刷新功能**
- ✅ 问题库每30秒自动刷新
- ✅ 添加/更新操作后立即刷新
- ✅ 防止数据更新后不显示的问题

## 📊 **预期最终结果**

修复完成后，您应该看到：

1. **问题库正常显示**：
   - ✅ 8个问题分类
   - ✅ 5个示例问题
   - ✅ 正确的统计数据

2. **功能正常工作**：
   - ✅ "➕ 添加问题组" 无验证错误
   - ✅ "➕ 增加问题" 正常工作
   - ✅ 编辑和删除功能正常

3. **自动刷新**：
   - ✅ 数据变更后自动更新显示
   - ✅ 问题数目实时同步

## 🔍 **故障排除**

如果问题仍然存在：

1. **检查环境变量**：
   ```bash
   curl https://leanatom.vercel.app/api/admin/diagnose
   ```

2. **查看 Vercel 部署日志**：
   - 在 Vercel 控制台查看 Functions 日志
   - 查找错误信息

3. **手动测试API**：
   ```bash
   # 测试添加分类
   curl -X POST https://leanatom.vercel.app/api/question-bank \
     -H "Content-Type: application/json" \
     -d '{"action":"addCategory","category":{"name":"测试分类","description":"测试"}}'
   ```

## 📞 **联系支持**

如果以上步骤都无法解决问题，请提供：

1. 诊断API的完整输出
2. Vercel 部署日志截图
3. 浏览器控制台错误信息
4. 具体的操作步骤和错误消息

---

**最后更新**: 2025-06-26  
**状态**: 代码修复已部署，等待环境变量配置
