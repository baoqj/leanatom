import { useState } from 'react';
import Head from 'next/head';

export default function AdminImport() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/import-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || '导入失败');
      }
    } catch (err) {
      setError('网络错误: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Head>
        <title>数据导入 - LeanAtom 管理</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              LeanAtom 数据导入
            </h1>
            
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  导入初始数据
                </h2>
                <p className="text-sm text-gray-600">
                  点击下方按钮导入问题分类和示例问题到数据库
                </p>
              </div>

              <button
                onClick={handleImport}
                disabled={importing}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  importing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {importing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    导入中...
                  </>
                ) : (
                  '开始导入数据'
                )}
              </button>

              {/* 结果显示 */}
              {result && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        导入成功！
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>导入了 {result.imported.categories} 个分类</p>
                        <p>导入了 {result.imported.questions} 个问题</p>
                        <p className="mt-2">
                          数据库统计：
                          <br />
                          总分类：{result.statistics.totalCategories}
                          <br />
                          总问题：{result.statistics.totalQuestions}
                          <br />
                          总标签：{result.statistics.totalTags}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 错误显示 */}
              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        导入失败
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 说明信息 */}
              <div className="mt-6 text-xs text-gray-500">
                <p>
                  此操作会导入初始的问题分类和示例问题。
                  <br />
                  可以安全地重复执行，不会创建重复数据。
                </p>
              </div>

              {/* 返回主页链接 */}
              <div className="mt-6">
                <a
                  href="/"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  ← 返回主页
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
