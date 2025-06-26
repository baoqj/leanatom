import { useState, useRef, useEffect } from 'react';
import LLMStatus from './LLMStatus';
import QuestionBankSidebar from './QuestionBankSidebar';

// 生成时间戳的工具函数
const getTimestamp = () => {
  if (typeof window === 'undefined') {
    return null; // 服务器端返回 null
  }
  return new Date().toISOString();
};

export default function ChatInterface() {
  const [conversations, setConversations] = useState([
    {
      id: 'default',
      title: '新对话',
      messages: [
        {
          role: 'system',
          text: '欢迎使用 LeanAtom 助手！我可以帮您将地球化学和环境科学问题转换为 Lean 4 数学证明。请输入您的问题。',
          timestamp: null
        }
      ],
      createdAt: new Date().toISOString()
    }
  ]);
  
  const [currentConversationId, setCurrentConversationId] = useState('default');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [questionBankExpanded, setQuestionBankExpanded] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 获取当前对话
  const currentConversation = conversations.find(conv => conv.id === currentConversationId);
  const messages = currentConversation?.messages || [];

  // 客户端水合完成后设置时间戳
  useEffect(() => {
    setConversations(prev => prev.map(conv => ({
      ...conv,
      messages: conv.messages.map(msg => 
        msg.timestamp === null ? { ...msg, timestamp: getTimestamp() } : msg
      )
    })));
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 创建新对话
  const createNewConversation = () => {
    const newId = Date.now().toString();
    const newConversation = {
      id: newId,
      title: '新对话',
      messages: [
        {
          role: 'system',
          text: '欢迎使用 LeanAtom 助手！我可以帮您将地球化学和环境科学问题转换为 Lean 4 数学证明。请输入您的问题。',
          timestamp: getTimestamp()
        }
      ],
      createdAt: new Date().toISOString()
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newId);
  };

  // 更新对话标题
  const updateConversationTitle = (conversationId, newTitle) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, title: newTitle.substring(0, 30) + (newTitle.length > 30 ? '...' : '') }
        : conv
    ));
  };

  // 处理发送消息
  const handleAsk = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      text: input.trim(),
      timestamp: getTimestamp()
    };

    // 立即清除输入框
    const currentInput = input.trim();
    setInput('');
    setLoading(true);

    // 更新当前对话
    setConversations(prev => prev.map(conv => 
      conv.id === currentConversationId 
        ? { ...conv, messages: [...conv.messages, userMessage] }
        : conv
    ));

    // 如果是第一条用户消息，更新对话标题
    if (messages.filter(m => m.role === 'user').length === 0) {
      updateConversationTitle(currentConversationId, currentInput);
    }

    try {
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

      const res = await fetch('/api/lean-gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentInput,
          conversationHistory: messages.filter(m => m.role !== 'system')
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        // 处理特定的 HTTP 状态码
        if (res.status === 504) {
          throw new Error('服务器响应超时，请稍后重试');
        } else if (res.status === 503) {
          throw new Error('服务暂时不可用，请稍后重试');
        } else if (res.status === 429) {
          throw new Error('请求过于频繁，请稍后重试');
        } else {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
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

      setConversations(prev => prev.map(conv => 
        conv.id === currentConversationId 
          ? { ...conv, messages: [...conv.messages, reply] }
          : conv
      ));
    } catch (error) {
      console.error('Error:', error);

      let errorText = '抱歉，发生了错误。';

      // 处理不同类型的错误
      if (error.name === 'AbortError') {
        errorText = '请求超时，服务器响应时间过长。请稍后重试。';
      } else if (error.message.includes('504')) {
        errorText = '服务器网关超时。这通常是因为 AI 模型正在处理复杂问题。请稍等片刻后重试。';
      } else if (error.message.includes('503')) {
        errorText = '服务暂时不可用，可能是 AI 模型正在加载中。请稍后重试。';
      } else if (error.message.includes('429')) {
        errorText = '请求过于频繁，请稍等片刻后重试。';
      } else if (error.message.includes('fetch')) {
        errorText = '网络连接错误，请检查网络连接后重试。';
      } else {
        errorText = `发生了错误：${error.message}。请稍后重试。`;
      }

      const errorMessage = {
        role: 'assistant',
        text: `${errorText}\n\n💡 **建议**：\n- 等待 10-30 秒后重新发送问题\n- 如果问题复杂，可以尝试简化问题描述\n- 检查网络连接是否稳定`,
        timestamp: getTimestamp(),
        isError: true
      };
      setConversations(prev => prev.map(conv => 
        conv.id === currentConversationId 
          ? { ...conv, messages: [...conv.messages, errorMessage] }
          : conv
      ));
    }

    setLoading(false);
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  // 开始编辑消息
  const startEditMessage = (messageIndex, messageText) => {
    setEditingMessageIndex(messageIndex);
    setEditingText(messageText);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingMessageIndex(null);
    setEditingText('');
  };

  // 保存编辑并重新发送
  const saveEditAndResend = async () => {
    if (!editingText.trim() || loading) return;

    const messageIndex = editingMessageIndex;
    const newText = editingText.trim();

    // 取消编辑状态
    cancelEdit();

    // 创建新的用户消息
    const userMessage = {
      role: 'user',
      text: newText,
      timestamp: getTimestamp()
    };

    // 添加用户消息到对话中
    setConversations(prev => prev.map(conv =>
      conv.id === currentConversationId
        ? { ...conv, messages: [...conv.messages, userMessage] }
        : conv
    ));

    // 如果是第一条用户消息，更新对话标题
    if (messages.filter(m => m.role === 'user').length === 0) {
      updateConversationTitle(currentConversationId, newText);
    }

    // 发送请求
    setLoading(true);
    try {
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

      const res = await fetch('/api/lean-gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newText,
          conversationHistory: messages.filter(m => m.role !== 'system')
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        // 处理特定的 HTTP 状态码
        if (res.status === 504) {
          throw new Error('服务器响应超时，请稍后重试');
        } else if (res.status === 503) {
          throw new Error('服务暂时不可用，请稍后重试');
        } else if (res.status === 429) {
          throw new Error('请求过于频繁，请稍后重试');
        } else {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
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

      setConversations(prev => prev.map(conv =>
        conv.id === currentConversationId
          ? { ...conv, messages: [...conv.messages, reply] }
          : conv
      ));
    } catch (error) {
      console.error('Error:', error);

      let errorText = '抱歉，发生了错误。';

      // 处理不同类型的错误
      if (error.name === 'AbortError') {
        errorText = '请求超时，服务器响应时间过长。请稍后重试。';
      } else if (error.message.includes('504')) {
        errorText = '服务器网关超时。这通常是因为 AI 模型正在处理复杂问题。请稍等片刻后重试。';
      } else if (error.message.includes('503')) {
        errorText = '服务暂时不可用，可能是 AI 模型正在加载中。请稍后重试。';
      } else if (error.message.includes('429')) {
        errorText = '请求过于频繁，请稍等片刻后重试。';
      } else if (error.message.includes('fetch')) {
        errorText = '网络连接错误，请检查网络连接后重试。';
      } else {
        errorText = `发生了错误：${error.message}。请稍后重试。`;
      }

      const errorMessage = {
        role: 'assistant',
        text: `${errorText}\n\n💡 **建议**：\n- 等待 10-30 秒后重新发送问题\n- 如果问题复杂，可以尝试简化问题描述\n- 检查网络连接是否稳定`,
        timestamp: getTimestamp(),
        isError: true
      };
      setConversations(prev => prev.map(conv =>
        conv.id === currentConversationId
          ? { ...conv, messages: [...conv.messages, errorMessage] }
          : conv
      ));
    }

    setLoading(false);
  };

  // 刷新消息（重新发送或清除错误）
  const refreshMessage = async (messageIndex) => {
    const message = messages[messageIndex];
    if (!message || message.role !== 'user') return;

    // 检查下一条消息是否是错误消息
    const nextMessage = messages[messageIndex + 1];
    const isNextMessageError = nextMessage && nextMessage.role === 'assistant' && nextMessage.isError;

    if (isNextMessageError) {
      // 如果下一条是错误消息，删除错误消息并重新发送
      setConversations(prev => prev.map(conv =>
        conv.id === currentConversationId
          ? {
              ...conv,
              messages: conv.messages.filter((_, idx) => idx !== messageIndex + 1)
            }
          : conv
      ));
    }

    // 重新发送用户消息
    const userText = message.text;

    // 发送请求
    setLoading(true);
    try {
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

      const res = await fetch('/api/lean-gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userText,
          conversationHistory: messages.slice(0, messageIndex + 1).filter(m => m.role !== 'system')
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        // 处理特定的 HTTP 状态码
        if (res.status === 504) {
          throw new Error('服务器响应超时，请稍后重试');
        } else if (res.status === 503) {
          throw new Error('服务暂时不可用，请稍后重试');
        } else if (res.status === 429) {
          throw new Error('请求过于频繁，请稍后重试');
        } else {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
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

      setConversations(prev => prev.map(conv =>
        conv.id === currentConversationId
          ? { ...conv, messages: [...conv.messages, reply] }
          : conv
      ));
    } catch (error) {
      console.error('Error:', error);

      let errorText = '抱歉，发生了错误。';

      // 处理不同类型的错误
      if (error.name === 'AbortError') {
        errorText = '请求超时，服务器响应时间过长。请稍后重试。';
      } else if (error.message.includes('504')) {
        errorText = '服务器网关超时。这通常是因为 AI 模型正在处理复杂问题。请稍等片刻后重试。';
      } else if (error.message.includes('503')) {
        errorText = '服务暂时不可用，可能是 AI 模型正在加载中。请稍后重试。';
      } else if (error.message.includes('429')) {
        errorText = '请求过于频繁，请稍等片刻后重试。';
      } else if (error.message.includes('fetch')) {
        errorText = '网络连接错误，请检查网络连接后重试。';
      } else {
        errorText = `发生了错误：${error.message}。请稍后重试。`;
      }

      const errorMessage = {
        role: 'assistant',
        text: `${errorText}\n\n💡 **建议**：\n- 等待 10-30 秒后重新发送问题\n- 如果问题复杂，可以尝试简化问题描述\n- 检查网络连接是否稳定`,
        timestamp: getTimestamp(),
        isError: true
      };
      setConversations(prev => prev.map(conv =>
        conv.id === currentConversationId
          ? { ...conv, messages: [...conv.messages, errorMessage] }
          : conv
      ));
    }

    setLoading(false);
  };

  // 切换对话
  const switchConversation = (conversationId) => {
    setCurrentConversationId(conversationId);
  };

  // 处理问题库选择
  const handleQuestionSelect = (questionContent) => {
    setInput(questionContent);
    setSelectedCategory(null);
    setQuestionBankExpanded(false);
    // 聚焦到输入框
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // 处理分类选择
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setQuestionBankExpanded(true);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* 左侧边栏 - 对话历史 */}
      <div style={{
        width: '260px',
        backgroundColor: '#f7f9fc',
        borderRight: '1px solid #e1e5e9',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* 头部 Logo 和标题 */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #e1e5e9',
          backgroundColor: '#ffffff'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <img 
              src="/logo.png" 
              alt="LeanAtom Logo" 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px'
              }}
            />
            <h1 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1a365d',
              letterSpacing: '-0.025em'
            }}>
              LeanAtom
            </h1>
          </div>
          
          <button
            onClick={createNewConversation}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2c5aa0'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3182ce'}
          >
            + 新对话
          </button>
        </div>

        {/* 对话列表 */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '0.5rem'
        }}>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => switchConversation(conv.id)}
              style={{
                padding: '0.75rem',
                margin: '0.25rem 0',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: conv.id === currentConversationId ? '#e6f3ff' : 'transparent',
                border: conv.id === currentConversationId ? '1px solid #3182ce' : '1px solid transparent',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                if (conv.id !== currentConversationId) {
                  e.target.style.backgroundColor = '#f1f5f9';
                }
              }}
              onMouseOut={(e) => {
                if (conv.id !== currentConversationId) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#2d3748',
                marginBottom: '0.25rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {conv.title}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#718096'
              }}>
                {new Date(conv.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>

        {/* 底部状态 */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid #e1e5e9',
          backgroundColor: '#ffffff'
        }}>
          <LLMStatus />
        </div>
      </div>

      {/* 中间对话区域 */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: '400px'
      }}>
        {/* 顶部工具栏 */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e1e5e9',
          backgroundColor: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#2d3748'
          }}>
            {currentConversation?.title || '新对话'}
          </h2>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              color: '#4a5568',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={showExplanation}
                onChange={(e) => setShowExplanation(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#3182ce'
                }}
              />
              显示解释过程
            </label>
          </div>
        </div>

        {/* 消息区域 */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '1rem 0'
        }}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '0 1.5rem'
          }}>
            {messages.map((msg, index) => (
              <div key={index} style={{
                marginBottom: '1.5rem'
              }}>
                {msg.role === 'user' ? (
                  // 用户消息
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginBottom: '0.5rem'
                    }}>
                      <div style={{
                        maxWidth: '70%',
                        padding: '1rem 1.25rem',
                        backgroundColor: '#3182ce',
                        color: 'white',
                        borderRadius: '18px 18px 4px 18px',
                        fontSize: '0.95rem',
                        lineHeight: '1.5',
                        wordBreak: 'break-word'
                      }}>
                        {editingMessageIndex === index ? (
                          // 编辑模式
                          <div>
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              style={{
                                width: '100%',
                                minHeight: '60px',
                                padding: '0.5rem',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.95rem',
                                lineHeight: '1.5',
                                resize: 'vertical',
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                color: '#2d3748'
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                  e.preventDefault();
                                  saveEditAndResend();
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  cancelEdit();
                                }
                              }}
                              autoFocus
                            />
                            <div style={{
                              display: 'flex',
                              gap: '0.5rem',
                              marginTop: '0.5rem',
                              justifyContent: 'flex-end'
                            }}>
                              <button
                                onClick={saveEditAndResend}
                                disabled={loading}
                                style={{
                                  padding: '0.25rem 0.75rem',
                                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                  color: '#3182ce',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  cursor: loading ? 'not-allowed' : 'pointer',
                                  fontWeight: '500'
                                }}
                              >
                                {loading ? '发送中...' : '发送'}
                              </button>
                              <button
                                onClick={cancelEdit}
                                style={{
                                  padding: '0.25rem 0.75rem',
                                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                  color: '#718096',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer'
                                }}
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          // 显示模式
                          msg.text
                        )}
                      </div>
                    </div>
                    {/* 用户消息下方的操作按钮 */}
                    {editingMessageIndex !== index && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.5rem',
                        marginBottom: '0.5rem',
                        paddingRight: '1rem'
                      }}>
                        <button
                          onClick={() => startEditMessage(index, msg.text)}
                          disabled={loading}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: 'transparent',
                            color: '#718096',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#f7fafc';
                            e.target.style.borderColor = '#cbd5e0';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.borderColor = '#e2e8f0';
                          }}
                        >
                          ✏️ 修改
                        </button>
                        <button
                          onClick={() => refreshMessage(index)}
                          disabled={loading}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: 'transparent',
                            color: '#718096',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#f7fafc';
                            e.target.style.borderColor = '#cbd5e0';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.borderColor = '#e2e8f0';
                          }}
                        >
                          🔄 刷新
                        </button>
                      </div>
                    )}
                  </div>
                ) : msg.role === 'assistant' ? (
                  // AI 回复
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{
                      maxWidth: '85%'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                      }}>
                        <img
                          src="/logo.png"
                          alt="LeanAtom"
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px'
                          }}
                        />
                        <span style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#2d3748'
                        }}>
                          LeanAtom
                        </span>
                      </div>

                      {/* Lean 代码优先显示 */}
                      {msg.leanCode && (
                        <div style={{
                          marginBottom: '1rem',
                          padding: '1rem',
                          backgroundColor: '#f7fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.75rem'
                          }}>
                            <span style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: '#2d3748'
                            }}>
                              🔬 Lean 4 代码
                            </span>
                            <button
                              onClick={() => navigator.clipboard.writeText(msg.leanCode)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                backgroundColor: '#e2e8f0',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                color: '#4a5568'
                              }}
                            >
                              复制
                            </button>
                          </div>
                          <pre style={{
                            margin: 0,
                            padding: '0.75rem',
                            backgroundColor: '#1a202c',
                            color: '#e2e8f0',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            lineHeight: '1.5',
                            overflow: 'auto',
                            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                          }}>
                            {msg.leanCode}
                          </pre>
                        </div>
                      )}

                      {/* 解释内容 - 可选显示 */}
                      {showExplanation && msg.text && (
                        <div style={{
                          padding: '1rem 1.25rem',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '18px 18px 18px 4px',
                          fontSize: '0.95rem',
                          lineHeight: '1.6',
                          color: '#2d3748',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {msg.text}
                        </div>
                      )}

                      {/* 验证结果 */}
                      {msg.verification && (
                        <div style={{
                          marginTop: '0.75rem',
                          padding: '0.75rem',
                          backgroundColor: msg.verification.isValid ? '#f0fff4' : '#fef5e7',
                          border: `1px solid ${msg.verification.isValid ? '#9ae6b4' : '#f6ad55'}`,
                          borderRadius: '8px',
                          fontSize: '0.875rem'
                        }}>
                          <div style={{
                            fontWeight: '600',
                            color: msg.verification.isValid ? '#22543d' : '#c05621',
                            marginBottom: '0.25rem'
                          }}>
                            {msg.verification.isValid ? '✅ 验证通过' : '⚠️ 验证失败'}
                          </div>
                          {msg.verification.message && (
                            <div style={{
                              color: msg.verification.isValid ? '#2f855a' : '#dd6b20'
                            }}>
                              {msg.verification.message}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // 系统消息
                  <div style={{
                    textAlign: 'center',
                    padding: '1rem',
                    color: '#718096',
                    fontSize: '0.875rem',
                    fontStyle: 'italic'
                  }}>
                    {msg.text}
                  </div>
                )}

                {/* 时间戳 */}
                {msg.timestamp && typeof window !== 'undefined' && (
                  <div style={{
                    textAlign: msg.role === 'user' ? 'right' : 'left',
                    fontSize: '0.75rem',
                    color: '#a0aec0',
                    marginTop: '0.25rem',
                    paddingLeft: msg.role === 'assistant' ? '2rem' : '0'
                  }}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem 1.25rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '18px 18px 18px 4px',
                  color: '#4a5568'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#3182ce',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}></div>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#3182ce',
                    animation: 'pulse 1.5s ease-in-out infinite 0.2s'
                  }}></div>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#3182ce',
                    animation: 'pulse 1.5s ease-in-out infinite 0.4s'
                  }}></div>
                  <span style={{ marginLeft: '0.5rem' }}>思考中...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入区域 */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e1e5e9',
          backgroundColor: '#ffffff'
        }}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-end'
            }}>
              <div style={{
                flex: 1,
                position: 'relative'
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="请输入您的地球化学或环境科学问题..."
                  style={{
                    width: '100%',
                    padding: '1rem 3rem 1rem 1rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '24px',
                    resize: 'none',
                    minHeight: '48px',
                    maxHeight: '120px',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: '#ffffff'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3182ce'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  rows={1}
                />
                <button
                  onClick={handleAsk}
                  disabled={loading || !input.trim()}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    bottom: '8px',
                    width: '32px',
                    height: '32px',
                    backgroundColor: loading || !input.trim() ? '#e2e8f0' : '#3182ce',
                    color: loading || !input.trim() ? '#a0aec0' : 'white',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    transition: 'all 0.2s'
                  }}
                >
                  ↑
                </button>
              </div>
            </div>

            <div style={{
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: '#718096',
              textAlign: 'center'
            }}>
              按 Enter 发送，Shift + Enter 换行
            </div>
          </div>
        </div>
      </div>

      {/* 右侧问题库栏 */}
      <QuestionBankSidebar
        selectedCategory={selectedCategory}
        expanded={questionBankExpanded}
        onCategorySelect={handleCategorySelect}
        onQuestionSelect={handleQuestionSelect}
        onClose={() => {
          setSelectedCategory(null);
          setQuestionBankExpanded(false);
        }}
      />
    </div>
  );
}
