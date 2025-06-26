
# LeanAtom - 地球化学 + Lean 4 对话式证明助手

LeanAtom 是一个创新的 Web 应用，结合了人工智能和形式化数学验证，专门用于地球化学和环境科学的建模与证明。

## 🌟 主要功能

- **自然语言转换**: 将地球化学问题转换为 Lean 4 数学代码
- **智能对话**: 基于 GPT-4 的交互式问答系统
- **代码验证**: 自动验证生成的 Lean 代码语法和逻辑
- **可视化展示**: 清晰展示推理过程和验证结果
- **专业领域**: 专注于核素迁移、地下水流动、污染物扩散等问题

## 🏗️ 技术架构

```
前端 (React/Next.js)
├── 对话界面组件
├── 代码展示组件
└── 结果可视化组件

后端 API (Node.js)
├── /api/lean-gpt (主要对话接口)
├── /api/verify-lean (代码验证接口)
└── 中间件 (认证、限流等)

核心处理层
├── GPT 处理模块 (OpenAI API)
├── Lean 验证模块 (Lean CLI)
├── 提示词管理
└── 代码解析器

Lean 项目
├── 地球化学模型库
├── 数学定理库
└── 验证脚本
```

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- (可选) Lean 4 CLI

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd LeanAtom
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env.local
   # 编辑 .env.local 文件，添加您的 OpenAI API Key
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **访问应用**
   打开浏览器访问 `http://localhost:3000`

### 环境变量配置

**选择 LLM 提供商:**

**选项 A: 使用 Hugging Face (推荐)**
```env
LLM_PROVIDER=huggingface
HUGGINGFACE_API_KEY=your_huggingface_token_here
ENABLE_LEAN_VERIFICATION=false
```

**选项 B: 使用 OpenAI**
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
ENABLE_LEAN_VERIFICATION=false
```

### 🔧 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run lean:check` - 检查 Lean 4 安装状态
- `npm run test:hf` - 测试 Hugging Face API 集成
- `npm run setup` - 完整项目设置检查

## 📖 使用指南

### 基本使用

1. **输入问题**: 在对话框中输入地球化学相关问题
   ```
   例如：请证明在流速 0.01 m/yr，衰变常数 1e-5 /yr，滞留因子 1.2 的情况下，
   10,000 年内地下水中铀浓度不会超过 0.015 mg/L。
   ```

2. **查看结果**: 系统会生成：
   - 问题分析
   - Lean 4 代码
   - 数学模型
   - 验证结果

3. **交互对话**: 可以继续提问：
   ```
   如果流速增加到 0.02 m/yr，结果会怎样？
   ```

### 支持的问题类型

- **核素衰变模型**: 放射性核素的时间演化
- **地下水流动**: 达西定律和流动方程
- **污染物迁移**: 平流-扩散-反应方程
- **吸附解吸**: 等温吸附模型
- **安全性分析**: 浓度限值和风险评估

## 🔧 开发指南

### 项目结构

```
LeanAtom/
├── components/           # React 组件
│   └── LeanGptAssistant.js
├── pages/               # Next.js 页面
│   ├── api/            # API 路由
│   │   ├── lean-gpt.js
│   │   └── verify-lean.js
│   └── index.js
├── lib/                # 工具库
│   ├── leanVerifier.js
│   └── promptTemplates.js
├── lean/               # Lean 项目
│   ├── LeanAtom/
│   │   └── Geochemistry.lean
│   └── lakefile.lean
└── public/             # 静态资源
```

### API 接口

#### POST /api/lean-gpt
主要对话接口，处理用户问题并返回 Lean 代码。

**请求体**:
```json
{
  "question": "用户问题",
  "conversationHistory": [...]
}
```

**响应**:
```json
{
  "answer": "GPT 回复",
  "leanCode": "生成的 Lean 代码",
  "questionType": "问题类型",
  "syntaxValidation": {...},
  "verification": {...}
}
```

#### POST /api/verify-lean
验证 Lean 代码的语法和逻辑。

### 添加新功能

1. **新的提示词模板**: 在 `lib/promptTemplates.js` 中添加
2. **新的验证规则**: 在 `lib/leanVerifier.js` 中扩展
3. **新的 Lean 模型**: 在 `lean/LeanAtom/` 目录下添加

## 🚀 部署

### Vercel 部署

1. **连接 GitHub**: 在 Vercel 控制台连接您的 GitHub 仓库
2. **配置环境变量**: 在 Vercel 项目设置中添加环境变量
3. **自动部署**: 推送代码到 main 分支即可自动部署

### Netlify 部署

1. **连接仓库**: 在 Netlify 控制台连接 GitHub 仓库
2. **构建设置**: 
   - Build command: `npm run build`
   - Publish directory: `.next`
3. **环境变量**: 在站点设置中配置环境变量

### 手动部署

```bash
# 构建项目
npm run build

# 启动生产服务器
npm start
```

## 🧪 测试

```bash
# 运行测试
npm test

# 运行 Lean 验证测试
cd lean && lake build
```

## 📚 示例

### 示例 1: 核素衰变模型

**输入**: "建立铀-238 的衰变模型，初始浓度 0.1 mg/L，衰变常数 1.55e-10 /yr"

**输出**: 
```lean
def uranium_decay (t : ℝ) : ℝ := 0.1 * Real.exp (-1.55e-10 * t)

theorem decay_positive : ∀ t ≥ 0, uranium_decay t > 0 := by
  sorry
```

### 示例 2: 地下水流动

**输入**: "在多孔介质中，流速 0.01 m/yr，孔隙度 0.3，计算实际流速"

**输出**:
```lean
def actual_velocity (v : ℝ) (porosity : ℝ) : ℝ := v / porosity

example : actual_velocity 0.01 0.3 = 0.01 / 0.3 := by rfl
```

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Lean 4](https://leanprover.github.io/) - 形式化数学验证系统
- [OpenAI](https://openai.com/) - GPT-4 API
- [Next.js](https://nextjs.org/) - React 框架
- [Mathlib](https://leanprover-community.github.io/mathlib4_docs/) - Lean 数学库

## 📞 联系

如有问题或建议，请通过以下方式联系：

- 项目 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 邮箱: your-email@example.com

---

**LeanAtom** - 让地球化学建模更加严谨和可靠 🌍⚛️
