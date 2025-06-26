import { useState, useRef, useEffect } from 'react';
import LLMStatus from './LLMStatus';

// 生成时间戳的工具函数
const getTimestamp = () => {
  if (typeof window === 'undefined') {
    return null; // 服务器端返回 null
  }
  return new Date().toISOString();
};

export default function LeanGptAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'system',
      text: '欢迎使用 LeanAtom 助手！我可以帮您将地球化学和环境科学问题转换为 Lean 4 数学证明。请输入您的问题。',
      timestamp: null // 避免水合错误，稍后在客户端设置
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLeanCode, setShowLeanCode] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 客户端水合完成后设置时间戳
  useEffect(() => {
    setMessages(prev => prev.map(msg =>
      msg.timestamp === null ? { ...msg, timestamp: getTimestamp() } : msg
    ));
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleAsk() {
    if (!input.trim()) return;
    setLoading(true);

    const userMessage = {
      role: 'user',
      text: input,
      timestamp: getTimestamp()
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch('/api/lean-gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: input,
          conversationHistory: messages.filter(m => m.role !== 'system')
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      const reply = {
        role: 'assistant',
        text: data.answer,
        leanCode: data.leanCode,
        questionType: data.questionType,
        syntaxValidation: data.syntaxValidation,
        codeInfo: data.codeInfo,
        verification: data.verification,
        timestamp: getTimestamp()
      };

      setMessages((prev) => [...prev, reply]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        role: 'assistant',
        text: `抱歉，发生了错误：${error.message}。请检查网络连接或稍后重试。`,
        timestamp: getTimestamp(),
        isError: true
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setInput('');
    setLoading(false);
  }

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  // 清空对话
  const clearConversation = () => {
    setMessages([{
      role: 'system',
      text: '对话已清空。请输入新的问题。',
      timestamp: getTimestamp()
    }]);
  };

  // 渲染消息组件
  const renderMessage = (msg, index) => {
    const isUser = msg.role === 'user';
    const isSystem = msg.role === 'system';
    const isError = msg.isError;

    return (
      <div key={index} style={{
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start'
      }}>
        <div style={{
          maxWidth: '80%',
          padding: '0.75rem 1rem',
          borderRadius: '1rem',
          backgroundColor: isUser ? '#007bff' : isSystem ? '#f8f9fa' : isError ? '#f8d7da' : '#e9ecef',
          color: isUser ? 'white' : isError ? '#721c24' : '#333',
          border: isError ? '1px solid #f5c6cb' : 'none'
        }}>
          <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            <strong>{isUser ? '用户' : isSystem ? '系统' : 'LeanAtom 助手'}</strong>
            {msg.timestamp && (
              <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                {typeof window !== 'undefined' ? new Date(msg.timestamp).toLocaleTimeString() : ''}
              </span>
            )}
            {msg.questionType && (
              <span style={{
                marginLeft: '0.5rem',
                padding: '0.125rem 0.375rem',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '0.25rem',
                fontSize: '0.75rem'
              }}>
                {msg.questionType}
              </span>
            )}
          </div>

          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
            {msg.text}
          </div>

          {/* 显示 Lean 代码 */}
          {msg.leanCode && showLeanCode && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 'bold',
                marginBottom: '0.5rem',
                color: '#495057'
              }}>
                生成的 Lean 代码:
              </div>
              <pre style={{
                backgroundColor: '#f8f9fa',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                overflow: 'auto',
                border: '1px solid #dee2e6'
              }}>
                {msg.leanCode}
              </pre>
            </div>
          )}

          {/* 显示验证结果 */}
          {msg.verification && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                borderRadius: '0.375rem',
                backgroundColor: msg.verification.success ? '#d4edda' : '#f8d7da',
                border: `1px solid ${msg.verification.success ? '#c3e6cb' : '#f5c6cb'}`,
                fontSize: '0.875rem'
              }}>
                <strong>Lean 验证: </strong>
                {msg.verification.success ? '✅ 通过' : '❌ 失败'}
                {msg.verification.error && (
                  <div style={{ marginTop: '0.25rem', color: '#721c24' }}>
                    {msg.verification.error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 显示代码信息 */}
          {msg.codeInfo && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', opacity: 0.8 }}>
              定理: {msg.codeInfo.theorems.length} | 定义: {msg.codeInfo.definitions.length} |
              导入: {msg.codeInfo.imports.length} | 行数: {msg.codeInfo.totalLines}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '1rem'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* 头部 */}
        <div style={{
          padding: '1.5rem',
          backgroundColor: '#007bff',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
              LeanAtom Assistant
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '0.875rem' }}>
              地球化学 + Lean 4 数学证明助手
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowLeanCode(!showLeanCode)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {showLeanCode ? '隐藏代码' : '显示代码'}
            </button>
            <button
              onClick={clearConversation}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              清空对话
            </button>
          </div>
        </div>

        {/* 消息区域 */}
        <div style={{
          height: '500px',
          overflowY: 'auto',
          padding: '1rem',
          backgroundColor: '#ffffff'
        }}>
          {messages.map((msg, i) => renderMessage(msg, i))}
          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '1rem',
              color: '#6c757d'
            }}>
              <div>🤔 正在思考中...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid #dee2e6',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="请输入您的地球化学或环境科学问题..."
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #ced4da',
                borderRadius: '0.5rem',
                resize: 'vertical',
                minHeight: '2.5rem',
                maxHeight: '8rem',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
              rows={1}
            />
            <button
              onClick={handleAsk}
              disabled={loading || !input.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: loading || !input.trim() ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                minWidth: '5rem'
              }}
            >
              {loading ? '思考中...' : '发送'}
            </button>
          </div>
          <div style={{
            marginTop: '0.5rem',
            fontSize: '0.75rem',
            color: '#6c757d',
            textAlign: 'center'
          }}>
            按 Enter 发送，Shift + Enter 换行
          </div>

          {/* LLM 状态显示 */}
          <div style={{ marginTop: '0.75rem' }}>
            <LLMStatus />
          </div>
        </div>
      </div>
    </div>
  );
}
