import { useState, useEffect } from 'react';

export default function QuestionBankSidebar({
  selectedCategory,
  expanded,
  onCategorySelect,
  onQuestionSelect,
  onClose
}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [expandedTags, setExpandedTags] = useState({});
  const [showAllTags, setShowAllTags] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showCategoryMenu, setShowCategoryMenu] = useState(null);
  const [showQuestionMenu, setShowQuestionMenu] = useState(null);

  // 加载分类数据
  useEffect(() => {
    loadCategories();
    loadStatistics();
  }, []);

  // 定时自动刷新数据（每30秒）
  useEffect(() => {
    const interval = setInterval(() => {
      loadCategories();
      loadStatistics();
    }, 30000); // 30秒刷新一次

    return () => clearInterval(interval);
  }, []);

  // 点击外部区域关闭菜单
  useEffect(() => {
    const handleClickOutside = () => {
      if (showCategoryMenu || showQuestionMenu) {
        setShowCategoryMenu(null);
        setShowQuestionMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showCategoryMenu, showQuestionMenu]);

  // 提取所有标签并按使用频率排序
  useEffect(() => {
    if (categories.length > 0) {
      const tagCount = {};
      categories.forEach(category => {
        if (category.questions && Array.isArray(category.questions)) {
          category.questions.forEach(question => {
            if (question.tags && Array.isArray(question.tags)) {
              question.tags.forEach(tag => {
                tagCount[tag] = (tagCount[tag] || 0) + 1;
              });
            }
          });
        }
      });

      const sortedTags = Object.entries(tagCount)
        .sort(([,a], [,b]) => b - a)
        .map(([tag]) => tag);

      setAllTags(sortedTags);
    }
  }, [categories]);

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

  const loadCategoryQuestions = async (categoryId) => {
    try {
      const response = await fetch(`/api/question-bank?action=questions&categoryId=${categoryId}`);
      const data = await response.json();

      // 更新选中分类的问题数据
      setCategories(prevCategories =>
        prevCategories.map(cat =>
          cat.id === categoryId
            ? {
                ...cat,
                questions: data.questions || [],
                questionCount: (data.questions || []).length
              }
            : cat
        )
      );
    } catch (error) {
      console.error('加载分类问题失败:', error);
    }
  };

  // 获取难度颜色
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return '#38a169';
      case 'medium': return '#d69e2e';
      case 'hard': return '#e53e3e';
      default: return '#718096';
    }
  };

  // 获取难度文本和图标
  const getDifficultyInfo = (difficulty) => {
    switch (difficulty) {
      case 'easy': return { text: '简单', icon: '🟢' };
      case 'medium': return { text: '中等', icon: '🟡' };
      case 'hard': return { text: '困难', icon: '🔴' };
      default: return { text: '未知', icon: '⚪' };
    }
  };

  // 美化数字显示
  const formatNumber = (num, difficulty = null) => {
    let backgroundColor = '#3182ce';
    if (difficulty === 'easy') backgroundColor = '#38a169';
    else if (difficulty === 'medium') backgroundColor = '#d69e2e';
    else if (difficulty === 'hard') backgroundColor = '#e53e3e';

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '24px',
        height: '20px',
        backgroundColor,
        color: 'white',
        borderRadius: '10px',
        fontSize: '0.75rem',
        fontWeight: '600',
        padding: '0 6px'
      }}>
        {num}
      </span>
    );
  };

  // 全局搜索问题
  const searchAllQuestions = () => {
    if (!searchQuery && selectedTags.length === 0) return [];

    const results = [];
    categories.forEach(category => {
      const matchedQuestions = category.questions.filter(question => {
        const matchesQuery = !searchQuery ||
          question.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          question.content.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesTags = selectedTags.length === 0 ||
          selectedTags.every(tag => question.tags.includes(tag));

        return matchesQuery && matchesTags;
      });

      if (matchedQuestions.length > 0) {
        results.push({
          category,
          questions: matchedQuestions
        });
      }
    });

    return results;
  };

  // 处理标签选择
  const handleTagSelect = (tag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
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
        // 刷新所有数据以确保同步
        await Promise.all([
          loadCategories(),
          loadStatistics()
        ]);
        setShowAddCategory(false);
      } else {
        const errorData = await response.json();
        console.error('添加分类失败:', errorData);
        alert(`添加分类失败: ${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('添加分类失败:', error);
      alert(`添加分类失败: ${error.message}`);
    }
  };

  // 编辑分类
  const handleEditCategory = async (categoryData) => {
    try {
      const response = await fetch('/api/question-bank', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCategory',
          categoryId: editingCategory.id,
          category: categoryData
        })
      });

      if (response.ok) {
        // 刷新所有数据以确保同步
        await Promise.all([
          loadCategories(),
          loadStatistics()
        ]);
        setEditingCategory(null);
      } else {
        const errorData = await response.json();
        alert(`编辑分类失败: ${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('编辑分类失败:', error);
    }
  };

  // 删除分类
  const handleDeleteCategory = async (category) => {
    try {
      // 先获取最新的问题数量
      const response = await fetch(`/api/question-bank?action=questions&categoryId=${category.id}`);
      const data = await response.json();
      const questionCount = (data.questions || []).length;

      if (questionCount > 0) {
        alert(`无法删除分组"${category.name}"，请先删除该分组中的所有问题（共${questionCount}个问题）。`);
        return;
      }

      if (confirm(`确定要删除分组"${category.name}"吗？`)) {
        const deleteResponse = await fetch('/api/question-bank', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'deleteCategory',
            categoryId: category.id
          })
        });

        if (deleteResponse.ok) {
          loadCategories();
          loadStatistics();
        } else {
          const errorData = await deleteResponse.json();
          alert(`删除分类失败: ${errorData.error || '未知错误'}`);
        }
      }
    } catch (error) {
      console.error('删除分类失败:', error);
      alert(`删除分类失败: ${error.message}`);
    }
  };

  // 添加问题
  const handleAddQuestion = async (questionData) => {
    try {
      const response = await fetch('/api/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addQuestion',
          categoryId: questionData.categoryId,
          question: {
            title: questionData.title,
            content: questionData.content,
            difficulty: questionData.difficulty,
            tags: questionData.tags
          }
        })
      });

      if (response.ok) {
        // 刷新所有数据以确保同步
        await Promise.all([
          loadCategories(),
          loadStatistics()
        ]);

        // 如果当前正在查看该分类，重新加载该分类的问题
        if (selectedCategory && selectedCategory.id === questionData.categoryId) {
          await loadCategoryQuestions(selectedCategory.id);
        }

        setShowAddQuestion(false);
      } else {
        const errorData = await response.json();
        console.error('添加问题失败:', errorData);
        alert(`添加问题失败: ${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('添加问题失败:', error);
      alert(`添加问题失败: ${error.message}`);
    }
  };

  // 编辑问题
  const handleEditQuestion = async (questionData) => {
    try {
      const response = await fetch('/api/question-bank', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateQuestion',
          questionId: editingQuestion.id,
          question: questionData
        })
      });

      if (response.ok) {
        // 刷新所有数据以确保同步
        await Promise.all([
          loadCategories(),
          loadStatistics()
        ]);

        // 如果当前正在查看该问题所属的分类，重新加载该分类的问题
        if (selectedCategory && selectedCategory.id === editingQuestion.categoryId) {
          await loadCategoryQuestions(selectedCategory.id);
        }

        setEditingQuestion(null);
      } else {
        const errorData = await response.json();
        alert(`编辑问题失败: ${errorData.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('编辑问题失败:', error);
    }
  };

  // 删除问题
  const handleDeleteQuestion = async (question) => {
    if (confirm(`确定要删除问题"${question.title}"吗？`)) {
      try {
        const response = await fetch('/api/question-bank', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'deleteQuestion',
            questionId: question.id
          })
        });

        if (response.ok) {
          // 刷新所有数据以确保同步
          await Promise.all([
            loadCategories(),
            loadStatistics()
          ]);

          // 如果当前正在查看该问题所属的分类，重新加载该分类的问题
          if (selectedCategory && selectedCategory.id === question.categoryId) {
            await loadCategoryQuestions(selectedCategory.id);
          }
        } else {
          const errorData = await response.json();
          alert(`删除问题失败: ${errorData.error || '未知错误'}`);
        }
      } catch (error) {
        console.error('删除问题失败:', error);
        alert(`删除问题失败: ${error.message}`);
      }
    }
  };

  const sidebarWidth = expanded ? '600px' : '280px';

  if (loading) {
    return (
      <div style={{
        width: sidebarWidth,
        backgroundColor: '#f8f9fa',
        borderLeft: '1px solid #e1e5e9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'width 0.3s ease'
      }}>
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{
      width: sidebarWidth,
      backgroundColor: '#f8f9fa',
      borderLeft: '1px solid #e1e5e9',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width 0.3s ease'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            <h2 style={{
              margin: 0,
              fontSize: expanded && selectedCategory ? '1.5rem' : '1.25rem',
              fontWeight: '700',
              color: expanded && selectedCategory ? '#1a365d' : '#2d3748',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textShadow: expanded && selectedCategory ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
            }}>
              {expanded && selectedCategory ? (
                <>
                  🗂️ {selectedCategory.name} {formatNumber(selectedCategory.questionCount || selectedCategory.questions?.length || 0)}
                </>
              ) : (
                <>
                  📚 问题库
                </>
              )}
            </h2>

            {/* 增加问题按钮 - 只在选中分类时显示 */}
            {expanded && selectedCategory && (
              <button
                onClick={() => setShowAddQuestion(true)}
                style={{
                  background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  padding: '0.375rem 0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                ➕ 增加问题
              </button>
            )}
          </div>
          {expanded && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                color: '#718096',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.color = '#2d3748';
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseOut={(e) => {
                e.target.style.color = '#718096';
                e.target.style.transform = 'scale(1)';
              }}
              title="返回分类列表"
            >
              ⬅️
            </button>
          )}
        </div>

        {/* 统计信息 */}
        {!expanded && statistics && (
          <div style={{
            fontSize: '0.875rem',
            color: '#4a5568',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🗂️ 分类:</span>
              {formatNumber(statistics?.totalCategories || 0)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>❓ 问题:</span>
              {formatNumber(statistics?.totalQuestions || 0)}
            </div>
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              marginTop: '0.25rem',
              fontSize: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>简单</span>
                {formatNumber(statistics.difficultyDistribution?.easy || 0, 'easy')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>中等</span>
                {formatNumber(statistics.difficultyDistribution?.medium || 0, 'medium')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>困难</span>
                {formatNumber(statistics.difficultyDistribution?.hard || 0, 'hard')}
              </div>
            </div>
          </div>
        )}

        {/* 分类描述 */}
        {expanded && selectedCategory && (
          <p style={{
            margin: 0,
            fontSize: '0.875rem',
            color: '#718096',
            lineHeight: '1.5'
          }}>
            {selectedCategory.description}
          </p>
        )}
      </div>

      {/* 内容区域 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '1rem'
      }}>
        {!expanded ? (
          // 显示分类列表
          <div>
            {/* 搜索栏 */}
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="搜索问题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  marginBottom: '0.75rem'
                }}
              />

              {/* 标签展示栏 */}
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#4a5568',
                  marginBottom: '0.5rem',
                  fontWeight: '600'
                }}>
                  标签筛选
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  maxHeight: showAllTags ? 'none' : '4rem',
                  overflow: 'hidden'
                }}>
                  {allTags.map((tag, index) => (
                    <button
                      key={index}
                      onClick={() => handleTagSelect(tag)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        backgroundColor: selectedTags.includes(tag) ? '#3182ce' : 'white',
                        color: selectedTags.includes(tag) ? 'white' : '#4a5568',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {allTags.length > 10 && (
                  <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    style={{
                      marginTop: '0.5rem',
                      background: 'none',
                      border: 'none',
                      color: '#3182ce',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {showAllTags ? '收起' : '显示全部标签'}
                  </button>
                )}
              </div>
            </div>

            {/* 搜索结果或分类列表 */}
            {(searchQuery || selectedTags.length > 0) ? (
              // 显示搜索结果
              <div>
                {searchAllQuestions().map((result, index) => (
                  <div key={index} style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#2d3748',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      🗂️ {result.category.name} {formatNumber(result.questions.length)}
                    </h4>
                    {result.questions.map((question) => (
                      <div
                        key={question.id}
                        onClick={() => onQuestionSelect(question.content)}
                        style={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          marginBottom: '0.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#2d3748',
                          marginBottom: '0.25rem'
                        }}>
                          {question.title}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#718096',
                          display: 'flex',
                          gap: '0.25rem',
                          flexWrap: 'wrap'
                        }}>
                          {question.tags.slice(0, 3).map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              style={{
                                padding: '0.125rem 0.25rem',
                                backgroundColor: '#edf2f7',
                                borderRadius: '4px'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {searchAllQuestions().length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    color: '#718096',
                    padding: '2rem',
                    fontSize: '0.875rem'
                  }}>
                    未找到匹配的问题
                  </div>
                )}
              </div>
            ) : (
              // 显示分类列表
              <div>
                {/* 添加分类按钮 */}
                <button
                  onClick={() => setShowAddCategory(true)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    backgroundColor: '#3182ce',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  ➕ 添加问题组
                </button>

                {categories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => {
                      onCategorySelect(category);
                      loadCategoryQuestions(category.id);
                    }}
                    style={{
                      padding: '1rem',
                      margin: '0.5rem 0',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = '#3182ce';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#2d3748',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          flex: 1
                        }}
                      >
                        🗂️ {category.name} ({category.questionCount || category.questions?.length || 0})
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowCategoryMenu(showCategoryMenu === category.id ? null : category.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '1.2rem',
                              padding: '0.25rem',
                              color: '#718096',
                              borderRadius: '4px'
                            }}
                            title="更多操作"
                          >
                            ⋯
                          </button>
                          {showCategoryMenu === category.id && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              zIndex: 100,
                              minWidth: '120px',
                              overflow: 'hidden'
                            }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCategory(category);
                                  setShowCategoryMenu(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '0.75rem 1rem',
                                  border: 'none',
                                  background: 'none',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  color: '#2d3748',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#f7fafc'}
                                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                              >
                                ✏️ 编辑分组
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(category);
                                  setShowCategoryMenu(null);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '0.75rem 1rem',
                                  border: 'none',
                                  background: 'none',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  color: '#e53e3e',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#fed7d7'}
                                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                              >
                                🗑️ 删除分组
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#718096',
                      lineHeight: '1.4'
                    }}>
                      {category.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // 显示问题列表
          selectedCategory && (
            <div>
              {(selectedCategory.questions || []).map((question) => (
                <div
                  key={question.id}
                  onClick={() => onQuestionSelect(question.content)}
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    e.currentTarget.style.borderColor = '#3182ce';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.5rem'
                  }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#2d3748',
                        flex: 1,
                        lineHeight: '1.4'
                      }}
                    >
                      {question.title}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        backgroundColor: getDifficultyColor(question.difficulty),
                        color: 'white',
                        borderRadius: '12px',
                        fontWeight: '500'
                      }}>
                        {getDifficultyInfo(question.difficulty).icon}
                        {getDifficultyInfo(question.difficulty).text}
                      </div>
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowQuestionMenu(showQuestionMenu === question.id ? null : question.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            padding: '0.25rem',
                            color: '#718096',
                            borderRadius: '4px'
                          }}
                          title="更多操作"
                        >
                          ⋯
                        </button>
                        {showQuestionMenu === question.id && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 100,
                            minWidth: '120px',
                            overflow: 'hidden'
                          }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingQuestion(question);
                                setShowQuestionMenu(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                color: '#2d3748',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                              onMouseOver={(e) => e.target.style.backgroundColor = '#f7fafc'}
                              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              ✏️ 编辑问题
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQuestion(question);
                                setShowQuestionMenu(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                color: '#e53e3e',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                              onMouseOver={(e) => e.target.style.backgroundColor = '#fed7d7'}
                              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              🗑️ 删除问题
                            </button>
                          </div>
                        )}
                      </div>
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
                      flexWrap: 'wrap',
                      alignItems: 'center'
                    }}>
                      {(expandedTags[question.id] ? question.tags : question.tags.slice(0, 3)).map((tag, index) => (
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
                      {question.tags.length > 3 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedTags(prev => ({
                              ...prev,
                              [question.id]: !prev[question.id]
                            }));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3182ce',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            padding: '0.125rem 0.25rem'
                          }}
                        >
                          {expandedTags[question.id] ? '收起' : `+${question.tags.length - 3}`}
                        </button>
                      )}
                    </div>
                    <span>{question.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* 添加分类对话框 */}
      {showAddCategory && (
        <AddCategoryDialog
          onSave={handleAddCategory}
          onClose={() => setShowAddCategory(false)}
        />
      )}

      {/* 增加问题对话框 */}
      {showAddQuestion && (
        <AddQuestionDialog
          categoryId={selectedCategory?.id}
          onSave={handleAddQuestion}
          onClose={() => setShowAddQuestion(false)}
        />
      )}

      {/* 编辑分类对话框 */}
      {editingCategory && (
        <EditCategoryDialog
          category={editingCategory}
          onSave={handleEditCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}

      {/* 编辑问题对话框 */}
      {editingQuestion && (
        <EditQuestionDialog
          question={editingQuestion}
          categories={categories}
          onSave={handleEditQuestion}
          onClose={() => setEditingQuestion(null)}
        />
      )}
    </div>
  );
}

// 添加分类对话框组件
function AddCategoryDialog({ onSave, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSave({ name: name.trim(), description: description.trim() });
    }
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        width: '400px',
        maxWidth: '90vw'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>添加问题组</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              分组名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
              placeholder="请输入分组名称"
              required
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              分组描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '0.875rem',
                minHeight: '80px',
                resize: 'vertical'
              }}
              placeholder="请输入分组描述"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#3182ce',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 编辑分类对话框组件
function EditCategoryDialog({ category, onSave, onClose }) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSave({ name: name.trim(), description: description.trim() });
    }
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        width: '400px',
        maxWidth: '90vw'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>编辑问题组</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              分组名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
              required
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              分组描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '0.875rem',
                minHeight: '80px',
                resize: 'vertical'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#3182ce',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 添加问题对话框组件
function AddQuestionDialog({ categoryId, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [tags, setTags] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim() && content.trim()) {
      onSave({
        title: title.trim(),
        content: content.trim(),
        difficulty,
        categoryId,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      });
    }
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        width: '500px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>增加问题</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              问题标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
              placeholder="请输入问题标题"
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              问题内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '0.875rem',
                minHeight: '120px',
                resize: 'vertical'
              }}
              placeholder="请输入详细的问题描述..."
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              难度等级
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            >
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              标签 (用逗号分隔)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
              placeholder="例如: 地球化学, 环境科学, 数学建模"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#3182ce',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 编辑问题对话框组件
function EditQuestionDialog({ question, categories, onSave, onClose }) {
  const [title, setTitle] = useState(question.title);
  const [content, setContent] = useState(question.content);
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [categoryId, setCategoryId] = useState(question.categoryId);
  const [tags, setTags] = useState(question.tags ? question.tags.join(', ') : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim() && content.trim()) {
      onSave({
        title: title.trim(),
        content: content.trim(),
        difficulty,
        categoryId,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      });
    }
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        width: '500px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>编辑问题</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              问题标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              问题内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '0.875rem',
                minHeight: '120px',
                resize: 'vertical'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              所属分组
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              难度等级
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            >
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              标签 (用逗号分隔)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
              placeholder="例如: 地球化学, 环境科学"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#3182ce',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
