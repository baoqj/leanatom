// Supabase 客户端配置
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 问题库数据库操作类
export class QuestionBankDB {
  
  // 获取所有分类及其问题
  static async getAllCategories() {
    try {
      const { data: categories, error: categoriesError } = await supabase
        .from('question_categories')
        .select('*')
        .order('created_at');

      if (categoriesError) throw categoriesError;

      // 为每个分类获取问题
      const categoriesWithQuestions = await Promise.all(
        categories.map(async (category) => {
          const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select(`
              *,
              question_tags (
                tags (
                  name
                )
              )
            `)
            .eq('category_id', category.id)
            .order('created_at');

          if (questionsError) throw questionsError;

          // 格式化问题数据
          const formattedQuestions = questions.map(question => ({
            id: question.id,
            title: question.title,
            content: question.content,
            difficulty: question.difficulty,
            createdAt: question.created_at,
            tags: question.question_tags.map(qt => qt.tags.name)
          }));

          return {
            id: category.id,
            name: category.name,
            description: category.description,
            questions: formattedQuestions
          };
        })
      );

      return categoriesWithQuestions;
    } catch (error) {
      console.error('获取分类失败:', error);
      throw error;
    }
  }

  // 获取单个分类
  static async getCategory(categoryId) {
    try {
      const { data: category, error: categoryError } = await supabase
        .from('question_categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (categoryError) throw categoryError;

      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select(`
          *,
          question_tags (
            tags (
              name
            )
          )
        `)
        .eq('category_id', categoryId)
        .order('created_at');

      if (questionsError) throw questionsError;

      const formattedQuestions = questions.map(question => ({
        id: question.id,
        title: question.title,
        content: question.content,
        difficulty: question.difficulty,
        createdAt: question.created_at,
        tags: question.question_tags.map(qt => qt.tags.name)
      }));

      return {
        id: category.id,
        name: category.name,
        description: category.description,
        questions: formattedQuestions
      };
    } catch (error) {
      console.error('获取分类失败:', error);
      throw error;
    }
  }

  // 搜索问题
  static async searchQuestions(searchTerm) {
    try {
      const { data: questions, error } = await supabase
        .from('questions')
        .select(`
          *,
          question_categories (
            name
          ),
          question_tags (
            tags (
              name
            )
          )
        `)
        .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return questions.map(question => ({
        id: question.id,
        title: question.title,
        content: question.content,
        difficulty: question.difficulty,
        createdAt: question.created_at,
        categoryName: question.question_categories.name,
        tags: question.question_tags.map(qt => qt.tags.name)
      }));
    } catch (error) {
      console.error('搜索问题失败:', error);
      throw error;
    }
  }

  // 根据标签搜索问题
  static async searchByTag(tagName) {
    try {
      const { data: questions, error } = await supabase
        .from('questions')
        .select(`
          *,
          question_categories (
            name
          ),
          question_tags!inner (
            tags!inner (
              name
            )
          )
        `)
        .eq('question_tags.tags.name', tagName)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return questions.map(question => ({
        id: question.id,
        title: question.title,
        content: question.content,
        difficulty: question.difficulty,
        createdAt: question.created_at,
        categoryName: question.question_categories.name,
        tags: question.question_tags.map(qt => qt.tags.name)
      }));
    } catch (error) {
      console.error('按标签搜索失败:', error);
      throw error;
    }
  }

  // 创建新分类
  static async createCategory(categoryData) {
    try {
      const { data, error } = await supabase
        .from('question_categories')
        .insert([{
          id: categoryData.id,
          name: categoryData.name,
          description: categoryData.description
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('创建分类失败:', error);
      throw error;
    }
  }

  // 更新分类
  static async updateCategory(categoryId, categoryData) {
    try {
      const { data, error } = await supabase
        .from('question_categories')
        .update({
          name: categoryData.name,
          description: categoryData.description
        })
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('更新分类失败:', error);
      throw error;
    }
  }

  // 删除分类
  static async deleteCategory(categoryId) {
    try {
      const { error } = await supabase
        .from('question_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('删除分类失败:', error);
      throw error;
    }
  }

  // 创建新问题
  static async createQuestion(questionData) {
    try {
      // 插入问题
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert([{
          id: questionData.id,
          category_id: questionData.categoryId,
          title: questionData.title,
          content: questionData.content,
          difficulty: questionData.difficulty
        }])
        .select()
        .single();

      if (questionError) throw questionError;

      // 处理标签
      if (questionData.tags && questionData.tags.length > 0) {
        await this.updateQuestionTags(question.id, questionData.tags);
      }

      return question;
    } catch (error) {
      console.error('创建问题失败:', error);
      throw error;
    }
  }

  // 更新问题标签
  static async updateQuestionTags(questionId, tags) {
    try {
      // 删除现有标签关联
      await supabase
        .from('question_tags')
        .delete()
        .eq('question_id', questionId);

      // 为每个标签创建或获取标签ID
      const tagIds = [];
      for (const tagName of tags) {
        let { data: tag, error } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tagName)
          .single();

        if (error && error.code === 'PGRST116') {
          // 标签不存在，创建新标签
          const { data: newTag, error: createError } = await supabase
            .from('tags')
            .insert([{ name: tagName }])
            .select()
            .single();

          if (createError) throw createError;
          tagIds.push(newTag.id);
        } else if (error) {
          throw error;
        } else {
          tagIds.push(tag.id);
        }
      }

      // 创建问题标签关联
      const questionTags = tagIds.map(tagId => ({
        question_id: questionId,
        tag_id: tagId
      }));

      const { error: linkError } = await supabase
        .from('question_tags')
        .insert(questionTags);

      if (linkError) throw linkError;
    } catch (error) {
      console.error('更新问题标签失败:', error);
      throw error;
    }
  }

  // 更新问题
  static async updateQuestion(questionId, questionData) {
    try {
      const { data, error } = await supabase
        .from('questions')
        .update({
          title: questionData.title,
          content: questionData.content,
          difficulty: questionData.difficulty,
          category_id: questionData.categoryId
        })
        .eq('id', questionId)
        .select()
        .single();

      if (error) throw error;

      // 更新标签
      if (questionData.tags) {
        await this.updateQuestionTags(questionId, questionData.tags);
      }

      return data;
    } catch (error) {
      console.error('更新问题失败:', error);
      throw error;
    }
  }

  // 删除问题
  static async deleteQuestion(questionId) {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('删除问题失败:', error);
      throw error;
    }
  }

  // 获取所有标签
  static async getAllTags() {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('获取标签失败:', error);
      throw error;
    }
  }
}
