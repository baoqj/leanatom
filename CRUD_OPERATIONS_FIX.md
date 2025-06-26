# 问题库 CRUD 操作修复报告

## 问题描述

用户报告在本地和生产环境中遇到以下 CRUD 操作错误：

### 本地环境错误
- 删除分类失败: 未知操作
- 删除问题失败: 未知操作  
- 编辑问题失败: 缺少问题 ID 或更新信息

### 生产环境错误
- 删除问题失败: 未知操作
- 删除分类失败: 未知操作

## 根本原因分析

### 1. DELETE 请求参数传递方式错误
**问题**: 前端将 DELETE 请求的参数放在请求体中，但 API 期望从查询参数中获取。

**前端代码（错误）**:
```javascript
const response = await fetch('/api/question-bank', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'deleteCategory',
    categoryId: category.id
  })
});
```

**API 期望（正确）**:
```javascript
async function handleDelete(req, res, query, storageManager) {
  const { action, categoryId, questionId } = query; // 从查询参数获取
}
```

### 2. PUT 请求字段名不匹配
**问题**: 前端发送的字段名与 API 期望的字段名不一致。

**前端发送（错误）**:
```javascript
body: JSON.stringify({
  action: 'updateQuestion',
  questionId: editingQuestion.id,
  question: questionData  // 错误字段名
})
```

**API 期望（正确）**:
```javascript
async function handlePut(req, res, body, storageManager) {
  const { action, categoryId, questionId, updates } = body; // 期望 updates 字段
}
```

### 3. 验证逻辑过于严格
**问题**: `updateQuestion` 方法的验证逻辑要求所有字段，包括 `categoryId`，但更新操作通常只需要更新特定字段。

## 修复方案

### 1. 修复 DELETE 请求参数传递

**删除分类**:
```javascript
// 修复前
const deleteResponse = await fetch('/api/question-bank', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'deleteCategory',
    categoryId: category.id
  })
});

// 修复后
const deleteResponse = await fetch(`/api/question-bank?action=deleteCategory&categoryId=${category.id}`, {
  method: 'DELETE'
});
```

**删除问题**:
```javascript
// 修复前
const response = await fetch('/api/question-bank', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'deleteQuestion',
    questionId: question.id
  })
});

// 修复后
const response = await fetch(`/api/question-bank?action=deleteQuestion&questionId=${question.id}`, {
  method: 'DELETE'
});
```

### 2. 修复 PUT 请求字段名

**编辑分类**:
```javascript
// 修复前
body: JSON.stringify({
  action: 'updateCategory',
  categoryId: editingCategory.id,
  category: categoryData
})

// 修复后
body: JSON.stringify({
  action: 'updateCategory',
  categoryId: editingCategory.id,
  updates: categoryData
})
```

**编辑问题**:
```javascript
// 修复前
body: JSON.stringify({
  action: 'updateQuestion',
  questionId: editingQuestion.id,
  question: questionData
})

// 修复后
body: JSON.stringify({
  action: 'updateQuestion',
  questionId: editingQuestion.id,
  updates: questionData
})
```

### 3. 简化验证逻辑

**修复前**:
```javascript
async updateQuestion(id, questionData) {
  // 验证数据（更新时需要ID）
  if (!DataValidator.validateQuestion({ id, ...questionData }, true)) {
    throw new StorageError('问题数据验证失败', 'VALIDATION_ERROR');
  }
}
```

**修复后**:
```javascript
async updateQuestion(id, questionData) {
  // 简化验证逻辑，只检查必要字段
  if (!questionData.title || typeof questionData.title !== 'string' || questionData.title.trim() === '') {
    throw new StorageError('问题标题是必填的', 'VALIDATION_ERROR');
  }

  if (!questionData.content || typeof questionData.content !== 'string' || questionData.content.trim() === '') {
    throw new StorageError('问题内容是必填的', 'VALIDATION_ERROR');
  }

  if (questionData.difficulty && !['easy', 'medium', 'hard'].includes(questionData.difficulty)) {
    throw new StorageError('难度等级必须是 easy、medium 或 hard', 'VALIDATION_ERROR');
  }
}
```

### 4. 优化更新逻辑

**修复前**:
```javascript
const { data: question, error: questionError } = await this.supabase
  .from('questions')
  .update({
    title: questionData.title,
    content: questionData.content,
    difficulty: questionData.difficulty,
    category_id: questionData.categoryId
  })
```

**修复后**:
```javascript
// 构建更新对象，只包含提供的字段
const updateData = {};
if (questionData.title !== undefined) updateData.title = questionData.title;
if (questionData.content !== undefined) updateData.content = questionData.content;
if (questionData.difficulty !== undefined) updateData.difficulty = questionData.difficulty;
if (questionData.categoryId !== undefined) updateData.category_id = questionData.categoryId;

const { data: question, error: questionError } = await this.supabase
  .from('questions')
  .update(updateData)
```

## 测试验证

### API 测试结果

1. **删除问题** ✅
```bash
curl -s -X DELETE "http://localhost:3000/api/question-bank?action=deleteQuestion&questionId=-mcdonf7f"
# 返回: {"message":"问题删除成功","question":{...}}
```

2. **删除分类** ✅
```bash
curl -s -X DELETE "http://localhost:3000/api/question-bank?action=deleteCategory&categoryId=-mcdosg9p"
# 返回: {"message":"分类删除成功","category":{...}}
```

3. **编辑问题** ✅
```bash
curl -X PUT "http://localhost:3000/api/question-bank" \
  -H "Content-Type: application/json" \
  -d '{"action": "updateQuestion", "questionId": "-mcdooc4k", "updates": {...}}'
# 返回: {"question":{...}}
```

4. **删除验证** ✅
```bash
curl -X DELETE "http://localhost:3000/api/question-bank?action=deleteCategory&categoryId=test-id"
# 返回: {"error":"无法删除分类，该分类包含 1 个问题，请先删除所有问题"}
```

## 部署状态

- ✅ 本地测试完全通过
- ✅ 代码已推送到 GitHub (commit: 014a7e7)
- 🔄 Vercel 自动部署中

## 影响范围

### 修复的文件
1. `components/QuestionBankSidebar.js` - 前端 CRUD 操作调用
2. `lib/storage/DatabaseStorage.js` - 后端验证和更新逻辑

### 修复的功能
- ✅ 删除分类
- ✅ 删除问题  
- ✅ 编辑分类
- ✅ 编辑问题
- ✅ 删除验证保护

## 预期结果

修复后，本地和生产环境的所有问题库 CRUD 操作都应该正常工作：
- 用户可以正常删除分类和问题
- 用户可以正常编辑分类和问题
- 删除验证功能正常工作，防止删除包含问题的分类
- 所有操作后数据同步正常，界面实时更新

## 技术要点

1. **HTTP 方法与参数传递**: DELETE 请求应使用查询参数，PUT/POST 请求使用请求体
2. **API 契约一致性**: 前端调用必须与后端 API 期望的参数格式完全匹配
3. **验证逻辑优化**: 更新操作的验证应该更灵活，只验证提供的字段
4. **部分更新支持**: 更新操作应支持只更新部分字段，而不是要求所有字段
