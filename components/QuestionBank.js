import { useState, useEffect } from 'react';

export default function QuestionBank({ onQuestionSelect, onClose }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [statistics, setStatistics] = useState(null);

  // 加载分类数据
  useEffect(() => {
    loadCategories();
    loadStatistics();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/question-bank?action=categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('加载分类失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch('/api/question-bank?action=statistics');
      const data = await response.json();
      setStatistics(data.statistics);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  };

  // 搜索问题
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/question-bank?action=search&search=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('搜索失败:', error);
    }
  };

  // 选择问题
  const handleQuestionClick = (question) => {
    onQuestionSelect(question.content);
    onClose();
  };

  // 添加分类
  const handleAddCategory = async (categoryData) => {
    try {
      const response = await fetch('/api/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addCategory',
          category: categoryData
        })
      });

      if (response.ok) {
        loadCategories();
        setShowAddCategory(false);
      }
    } catch (error) {
      console.error('添加分类失败:', error);
    }
  };

  // 更新分类
  const handleUpdateCategory = async (categoryId, updates) => {
    try {
      const response = await fetch('/api/question-bank', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCategory',
          categoryId,
          updates
        })
      });

      if (response.ok) {
        loadCategories();
        setEditingCategory(null);
      }
    } catch (error) {
      console.error('更新分类失败:', error);
    }
  };

  // 删除分类
  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('确定要删除这个分类吗？这将删除分类下的所有问题。')) {
      return;
    }

    try {
      const response = await fetch(`/api/question-bank?action=deleteCategory&categoryId=${categoryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadCategories();
        if (selectedCategory?.id === categoryId) {
          setSelectedCategory(null);
        }
      }
    } catch (error) {
      console.error('删除分类失败:', error);
    }
  };

  // 添加问题
  const handleAddQuestion = async (questionData) => {
    if (!selectedCategory) return;

    try {
      const response = await fetch('/api/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addQuestion',
          categoryId: selectedCategory.id,
          question: questionData
        })
      });

      if (response.ok) {
        loadCategories();
        setShowAddQuestion(false);
      }
    } catch (error) {
      console.error('添加问题失败:', error);
    }
  };

  // 删除问题
  const handleDeleteQuestion = async (questionId) => {
    if (!selectedCategory || !confirm('确定要删除这个问题吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/question-bank?action=deleteQuestion&categoryId=${selectedCategory.id}&questionId=${questionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadCategories();
      }
    } catch (error) {
      console.error('删除问题失败:', error);
    }
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div>加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        width: '90%',
        maxWidth: '1200px',
        height: '80%',
        borderRadius: '12px',
        display: 'flex',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* 左侧分类列表 */}
        <div style={{
          width: '300px',
          backgroundColor: '#f8f9fa',
          borderRight: '1px solid #e1e5e9',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* 头部 */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e1e5e9',
            backgroundColor: 'white'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#2d3748'
              }}>
                问题库
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#718096'
                }}
              >
                ×
              </button>
            </div>

            {/* 统计信息 */}
            {statistics && (
              <div style={{
                fontSize: '0.875rem',
                color: '#4a5568',
                marginBottom: '1rem'
              }}>
                <div>分类: {statistics.totalCategories}</div>
                <div>问题: {statistics.totalQuestions}</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span>简单: {statistics.questionsByDifficulty.easy}</span>
                  <span>中等: {statistics.questionsByDifficulty.medium}</span>
                  <span>困难: {statistics.questionsByDifficulty.hard}</span>
                </div>
              </div>
            )}

            {/* 搜索框 */}
            <input
              type="text"
              placeholder="搜索问题..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* 分类列表 */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '0.5rem'
          }}>
            {searchQuery ? (
              // 搜索结果
              <div>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#4a5568',
                  margin: '0.5rem 0',
                  padding: '0 0.5rem'
                }}>
                  搜索结果 ({searchResults.length})
                </h3>
                {searchResults.map((result) => (
                  <div
                    key={`${result.categoryId}-${result.id}`}
                    onClick={() => handleQuestionClick(result)}
                    style={{
                      padding: '0.75rem',
                      margin: '0.25rem 0',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#f7fafc'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#2d3748',
                      marginBottom: '0.25rem'
                    }}>
                      {result.title}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#718096'
                    }}>
                      {result.categoryName}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // 分类列表
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  margin: '0.5rem 0',
                  padding: '0 0.5rem'
                }}>
                  <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#4a5568',
                    margin: 0
                  }}>
                    分类
                  </h3>
                  <button
                    onClick={() => setShowAddCategory(true)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#3182ce',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    + 添加
                  </button>
                </div>

                {categories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => setSelectedCategory(category)}
                    style={{
                      padding: '0.75rem',
                      margin: '0.25rem 0',
                      backgroundColor: selectedCategory?.id === category.id ? '#e6f3ff' : 'white',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: selectedCategory?.id === category.id ? '1px solid #3182ce' : '1px solid #e2e8f0',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      if (selectedCategory?.id !== category.id) {
                        e.target.style.backgroundColor = '#f7fafc';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (selectedCategory?.id !== category.id) {
                        e.target.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#2d3748',
                      marginBottom: '0.25rem'
                    }}>
                      {category.name}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#718096'
                    }}>
                      {category.questions.length} 个问题
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧问题列表 */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {selectedCategory ? (
            <>
              {/* 分类头部 */}
              <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid #e1e5e9',
                backgroundColor: 'white'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem'
                }}>
                  <div>
                    <h3 style={{
                      margin: 0,
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#2d3748'
                    }}>
                      {selectedCategory.name}
                    </h3>
                    <p style={{
                      margin: '0.25rem 0 0 0',
                      fontSize: '0.875rem',
                      color: '#718096'
                    }}>
                      {selectedCategory.description}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setShowAddQuestion(true)}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#3182ce',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      + 添加问题
                    </button>
                    <button
                      onClick={() => setEditingCategory(selectedCategory)}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#e2e8f0',
                        color: '#4a5568',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(selectedCategory.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#fed7d7',
                        color: '#c53030',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>

              {/* 问题列表 */}
              <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '1rem'
              }}>
                {selectedCategory.questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    onClick={() => handleQuestionClick(question)}
                    onDelete={() => handleDeleteQuestion(question.id)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#718096',
              fontSize: '1.125rem'
            }}>
              请选择一个分类查看问题
            </div>
          )}
        </div>
      </div>

      {/* 添加分类对话框 */}
      {showAddCategory && (
        <AddCategoryDialog
          onSave={handleAddCategory}
          onCancel={() => setShowAddCategory(false)}
        />
      )}

      {/* 编辑分类对话框 */}
      {editingCategory && (
        <EditCategoryDialog
          category={editingCategory}
          onSave={(updates) => handleUpdateCategory(editingCategory.id, updates)}
          onCancel={() => setEditingCategory(null)}
        />
      )}

      {/* 添加问题对话框 */}
      {showAddQuestion && (
        <AddQuestionDialog
          onSave={handleAddQuestion}
          onCancel={() => setShowAddQuestion(false)}
        />
      )}
    </div>
  );
}

// 问题卡片组件
function QuestionCard({ question, onClick, onDelete }) {
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#38a169';
      case 'medium': return '#d69e2e';
      case 'hard': return '#e53e3e';
      default: return '#718096';
    }
  };

  const getDifficultyText = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return '未知';
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1rem',
      cursor: 'pointer',
      transition: 'all 0.2s',
      position: 'relative'
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
    onClick={onClick}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '0.5rem'
      }}>
        <h4 style={{
          margin: 0,
          fontSize: '1rem',
          fontWeight: '600',
          color: '#2d3748',
          flex: 1
        }}>
          {question.title}
        </h4>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          <span style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            backgroundColor: getDifficultyColor(question.difficulty),
            color: 'white',
            borderRadius: '12px',
            fontWeight: '500'
          }}>
            {getDifficultyText(question.difficulty)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#e53e3e',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '0.25rem'
            }}
            title="删除问题"
          >
            🗑️
          </button>
        </div>
      </div>

      <p style={{
        margin: '0 0 0.75rem 0',
        fontSize: '0.875rem',
        color: '#4a5568',
        lineHeight: '1.5',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {question.content}
      </p>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.75rem',
        color: '#718096'
      }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          {question.tags.map((tag, index) => (
            <span
              key={index}
              style={{
                padding: '0.125rem 0.375rem',
                backgroundColor: '#edf2f7',
                borderRadius: '4px',
                fontSize: '0.75rem'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <span>{question.createdAt}</span>
      </div>
    </div>
  );
}

// 添加分类对话框
function AddCategoryDialog({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      alert('请输入分类名称');
      return;
    }
    onSave({ name: name.trim(), description: description.trim() });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        width: '400px',
        maxWidth: '90%'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>添加新分类</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            分类名称 *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px'
            }}
            placeholder="输入分类名称"
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            分类描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              minHeight: '80px',
              resize: 'vertical'
            }}
            placeholder="输入分类描述"
          />
        </div>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// 编辑分类对话框
function EditCategoryDialog({ category, onSave, onCancel }) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description);

  const handleSave = () => {
    if (!name.trim()) {
      alert('请输入分类名称');
      return;
    }
    onSave({ name: name.trim(), description: description.trim() });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        width: '400px',
        maxWidth: '90%'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>编辑分类</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            分类名称 *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            分类描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              minHeight: '80px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// 添加问题对话框
function AddQuestionDialog({ onSave, onCancel }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [difficulty, setDifficulty] = useState('medium');

  const handleSave = () => {
    if (!title.trim()) {
      alert('请输入问题标题');
      return;
    }
    if (!content.trim()) {
      alert('请输入问题内容');
      return;
    }

    const questionData = {
      title: title.trim(),
      content: content.trim(),
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      difficulty
    };

    onSave(questionData);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        width: '600px',
        maxWidth: '90%',
        maxHeight: '80%',
        overflow: 'auto'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>添加新问题</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            问题标题 *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px'
            }}
            placeholder="输入问题标题"
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            问题内容 *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              minHeight: '120px',
              resize: 'vertical'
            }}
            placeholder="输入问题的详细描述和要求"
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            标签
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px'
            }}
            placeholder="输入标签，用逗号分隔"
          />
          <div style={{
            fontSize: '0.75rem',
            color: '#718096',
            marginTop: '0.25rem'
          }}>
            例如：铀, 衰变, 浓度, 地下水
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            难度等级
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '4px'
            }}
          >
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>
        </div>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e2e8f0',
              backgroundColor: 'white',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
