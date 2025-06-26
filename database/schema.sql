-- LeanAtom 问题库数据库架构
-- 适用于 Supabase PostgreSQL

-- 创建问题分类表
CREATE TABLE IF NOT EXISTS question_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建问题表
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(50) PRIMARY KEY,
    category_id VARCHAR(50) NOT NULL REFERENCES question_categories(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建标签表
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建问题标签关联表
CREATE TABLE IF NOT EXISTS question_tags (
    question_id VARCHAR(50) REFERENCES questions(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, tag_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);
CREATE INDEX IF NOT EXISTS idx_question_tags_question_id ON question_tags(question_id);
CREATE INDEX IF NOT EXISTS idx_question_tags_tag_id ON question_tags(tag_id);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为表添加更新时间触发器
CREATE TRIGGER update_question_categories_updated_at 
    BEFORE UPDATE ON question_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at 
    BEFORE UPDATE ON questions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全策略 (RLS)
ALTER TABLE question_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;

-- 创建公共访问策略（允许所有用户读取）
CREATE POLICY "Allow public read access on question_categories" 
    ON question_categories FOR SELECT 
    USING (true);

CREATE POLICY "Allow public read access on questions" 
    ON questions FOR SELECT 
    USING (true);

CREATE POLICY "Allow public read access on tags" 
    ON tags FOR SELECT 
    USING (true);

CREATE POLICY "Allow public read access on question_tags" 
    ON question_tags FOR SELECT 
    USING (true);

-- 创建管理员写入策略（需要认证）
CREATE POLICY "Allow authenticated users to insert question_categories" 
    ON question_categories FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update question_categories" 
    ON question_categories FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete question_categories" 
    ON question_categories FOR DELETE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert questions" 
    ON questions FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update questions" 
    ON questions FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete questions" 
    ON questions FOR DELETE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert tags" 
    ON tags FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert question_tags" 
    ON question_tags FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete question_tags" 
    ON question_tags FOR DELETE 
    USING (auth.role() = 'authenticated');
