// 问题库入口文件 - 使用分离的数据和代码
import { QuestionBankData } from './questionBankCode.js';

// 创建默认实例
export const questionBankData = new QuestionBankData();

// 向后兼容的导出
export const initialQuestionBank = {
  async getCategories() {
    const data = await questionBankData.loadData();
    return data.categories || [];
  }
};

// 导出数据操作类
export { QuestionBankData } from './questionBankCode.js';

export default questionBankData;
