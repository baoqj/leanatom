import { useState, useEffect } from 'react';

export default function LLMStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkLLMStatus();
  }, []);

  const checkLLMStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/llm-status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to check LLM status:', error);
      setStatus({
        provider: 'unknown',
        available: false,
        details: { error: 'Failed to check status' }
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (loading) return '#fbbf24'; // yellow
    return status?.available ? '#10b981' : '#ef4444'; // green or red
  };

  const getStatusText = () => {
    if (loading) return '检查中...';
    if (!status) return '未知';
    return status.available ? '可用' : '不可用';
  };

  const getProviderName = (provider) => {
    switch (provider) {
      case 'openai': return 'OpenAI';
      case 'huggingface': return 'Hugging Face';
      default: return provider;
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '0.5rem',
        fontSize: '0.875rem',
        color: '#6b7280',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getStatusColor()
        }}></div>
        检查 LLM 状态...
      </div>
    );
  }

  return (
    <div style={{
      padding: '0.75rem',
      backgroundColor: '#f9fafb',
      borderRadius: '0.5rem',
      border: '1px solid #e5e7eb',
      fontSize: '0.875rem'
    }}>
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getStatusColor()
          }}></div>
          <span>
            <strong>{getProviderName(status?.provider)}</strong> - {getStatusText()}
          </span>
        </div>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '0.75rem',
            padding: '0.25rem'
          }}
          onClick={(e) => {
            e.stopPropagation();
            checkLLMStatus();
          }}
        >
          🔄 刷新
        </button>
      </div>

      {showDetails && status && (
        <div style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>提供商:</strong> {getProviderName(status.provider)}
          </div>
          
          {status.details.model && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>模型:</strong> {status.details.model}
            </div>
          )}
          
          {status.details.configured !== undefined && (
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>API 配置:</strong> {status.details.configured ? '✅ 已配置' : '❌ 未配置'}
            </div>
          )}
          
          {status.details.error && (
            <div style={{ 
              marginBottom: '0.5rem',
              color: '#dc2626',
              fontSize: '0.8rem'
            }}>
              <strong>错误:</strong> {status.details.error}
            </div>
          )}
          
          {status.availableModels && (
            <div style={{ marginTop: '0.75rem' }}>
              <strong>可用模型:</strong>
              <div style={{ 
                marginTop: '0.25rem',
                fontSize: '0.8rem',
                color: '#6b7280'
              }}>
                {Object.keys(status.availableModels).map(model => (
                  <div key={model} style={{ marginBottom: '0.25rem' }}>
                    • {status.availableModels[model].name}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div style={{ 
            marginTop: '0.75rem',
            fontSize: '0.75rem',
            color: '#9ca3af'
          }}>
            最后检查: {new Date(status.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
