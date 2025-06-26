import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Lean 代码验证器类
 */
class LeanVerifier {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.leanProjectDir = path.join(process.cwd(), 'lean');
  }

  /**
   * 确保临时目录存在
   */
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * 验证 Lean 代码
   * @param {string} leanCode - 要验证的 Lean 代码
   * @param {string} filename - 文件名（可选）
   * @returns {Promise<Object>} 验证结果
   */
  async verifyCode(leanCode, filename = null) {
    await this.ensureTempDir();
    
    const tempFileName = filename || `temp_${Date.now()}.lean`;
    const tempFile = path.join(this.tempDir, tempFileName);
    
    try {
      // 写入临时文件
      await fs.writeFile(tempFile, leanCode);
      
      // 执行 Lean 验证
      const result = await this.runLeanCheck(tempFile);
      
      // 清理临时文件
      await this.cleanupTempFile(tempFile);
      
      return result;
    } catch (error) {
      // 确保清理临时文件
      await this.cleanupTempFile(tempFile);
      throw error;
    }
  }

  /**
   * 运行 Lean 检查
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 检查结果
   */
  async runLeanCheck(filePath) {
    try {
      // 尝试使用 lean 命令检查文件
      const { stdout, stderr } = await execAsync(`lean --check "${filePath}"`, {
        timeout: 30000, // 30秒超时
        cwd: this.leanProjectDir
      });
      
      return {
        success: stderr === '',
        output: stdout,
        error: stderr,
        hasErrors: stderr !== '',
        hasWarnings: stdout.includes('warning'),
        executionTime: Date.now()
      };
    } catch (error) {
      // 处理超时和其他错误
      if (error.killed && error.signal === 'SIGTERM') {
        return {
          success: false,
          output: '',
          error: 'Lean verification timed out (30s)',
          hasErrors: true,
          hasWarnings: false,
          executionTime: Date.now()
        };
      }
      
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        hasErrors: true,
        hasWarnings: false,
        executionTime: Date.now()
      };
    }
  }

  /**
   * 清理临时文件
   * @param {string} filePath - 要删除的文件路径
   */
  async cleanupTempFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // 忽略文件不存在的错误
      if (error.code !== 'ENOENT') {
        console.error('Failed to cleanup temp file:', error);
      }
    }
  }

  /**
   * 验证 Lean 代码语法
   * @param {string} leanCode - Lean 代码
   * @returns {Object} 语法检查结果
   */
  validateSyntax(leanCode) {
    const issues = [];
    
    // 基本语法检查
    if (!leanCode.trim()) {
      issues.push('Empty Lean code');
      return { valid: false, issues };
    }
    
    // 检查是否包含基本结构
    const hasImports = /^import\s+/.test(leanCode);
    const hasDefinitions = /\b(def|theorem|lemma|example)\s+/.test(leanCode);
    
    if (!hasImports) {
      issues.push('Missing import statements');
    }
    
    if (!hasDefinitions) {
      issues.push('No definitions, theorems, or lemmas found');
    }
    
    // 检查括号匹配
    const openParens = (leanCode.match(/\(/g) || []).length;
    const closeParens = (leanCode.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push('Mismatched parentheses');
    }
    
    // 检查大括号匹配
    const openBraces = (leanCode.match(/\{/g) || []).length;
    const closeBraces = (leanCode.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push('Mismatched braces');
    }
    
    return {
      valid: issues.length === 0,
      issues: issues,
      hasImports,
      hasDefinitions
    };
  }

  /**
   * 提取 Lean 代码中的定理和定义
   * @param {string} leanCode - Lean 代码
   * @returns {Object} 提取的信息
   */
  extractInfo(leanCode) {
    const theorems = [];
    const definitions = [];
    const imports = [];
    
    // 提取 import 语句
    const importMatches = leanCode.match(/^import\s+(.+)$/gm);
    if (importMatches) {
      imports.push(...importMatches.map(match => match.replace(/^import\s+/, '')));
    }
    
    // 提取定理
    const theoremMatches = leanCode.match(/theorem\s+(\w+)[^:]*:/g);
    if (theoremMatches) {
      theorems.push(...theoremMatches.map(match => 
        match.match(/theorem\s+(\w+)/)[1]
      ));
    }
    
    // 提取定义
    const defMatches = leanCode.match(/def\s+(\w+)[^:]*:/g);
    if (defMatches) {
      definitions.push(...defMatches.map(match => 
        match.match(/def\s+(\w+)/)[1]
      ));
    }
    
    return {
      imports,
      theorems,
      definitions,
      totalLines: leanCode.split('\n').length
    };
  }
}

// 创建单例实例
const leanVerifier = new LeanVerifier();

export default leanVerifier;
export { LeanVerifier };
