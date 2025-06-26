#!/bin/bash

# Lean 4 安装检查脚本

echo "🔍 检查 Lean 4 安装状态..."

# 设置环境变量
export PATH="$HOME/.elan/bin:$PATH"

# 检查 elan 是否安装
if command -v elan &> /dev/null; then
    echo "✅ Elan 已安装"
    echo "📍 Elan 版本: $(elan --version)"
else
    echo "❌ Elan 未安装"
    exit 1
fi

# 检查 lean 是否可用
echo "🔍 检查 Lean 可用性..."
if timeout 30 lean --version &> /dev/null; then
    echo "✅ Lean 4 已安装并可用"
    echo "📍 Lean 版本: $(lean --version)"
    
    # 检查 lake 是否可用
    if command -v lake &> /dev/null; then
        echo "✅ Lake 包管理器已安装"
        echo "📍 Lake 版本: $(lake --version)"
    else
        echo "⚠️  Lake 包管理器未找到"
    fi
    
    # 尝试构建 Lean 项目
    echo "🔍 检查 Lean 项目..."
    if [ -d "lean" ]; then
        cd lean
        echo "📁 进入 lean 目录"
        
        if [ -f "lakefile.lean" ]; then
            echo "✅ 找到 lakefile.lean"
            echo "🔨 尝试构建项目..."
            
            if timeout 60 lake build; then
                echo "✅ Lean 项目构建成功"
            else
                echo "⚠️  Lean 项目构建失败或超时"
            fi
        else
            echo "⚠️  未找到 lakefile.lean"
        fi
        cd ..
    else
        echo "⚠️  未找到 lean 目录"
    fi
    
else
    echo "⏳ Lean 4 正在安装中..."
    echo "💡 请等待安装完成，通常需要 5-10 分钟"
    echo "🔄 您可以稍后重新运行此脚本检查状态"
fi

echo ""
echo "📋 安装状态总结:"
echo "- Elan: $(command -v elan &> /dev/null && echo '✅ 已安装' || echo '❌ 未安装')"
echo "- Lean: $(timeout 5 lean --version &> /dev/null && echo '✅ 已安装' || echo '⏳ 安装中')"
echo "- Lake: $(command -v lake &> /dev/null && echo '✅ 已安装' || echo '⏳ 安装中')"

echo ""
echo "🚀 下一步操作:"
if timeout 5 lean --version &> /dev/null; then
    echo "1. Lean 4 已就绪，可以启用完整验证功能"
    echo "2. 更新 .env.local: ENABLE_LEAN_VERIFICATION=true"
    echo "3. 重启开发服务器: npm run dev"
else
    echo "1. 等待 Lean 4 安装完成"
    echo "2. 重新运行此脚本检查状态: bash scripts/check-lean.sh"
    echo "3. 安装完成后启用验证功能"
fi
