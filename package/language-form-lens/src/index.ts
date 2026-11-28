import { 语言形式篇章 } from './model/discourse.js'
import { 语言形式契合度结果, 语言形式生成目标 } from './model/generation-target.js'
import { 已解析语言形式配置, 语言形式输入, 语言形式配置, 语言形式配置Schema } from './schema.js'

export * from './model/corpus.js'
export * from './model/discourse.js'
export * from './model/generation-target.js'
export * from './schema.js'

/**
 * 语言形式透镜是一套固定观察口径的本地中文形式分析视角。
 * 它保存词性组合的窗口长度和例证保留数量，将原文同步分析为可比较的篇章。
 * 分析使用本地 jieba 词典和 Unicode 字符规则，无需外部模型或网络服务。
 */
export class 语言形式透镜 {
  private readonly 配置: 已解析语言形式配置

  public constructor(配置: 语言形式配置 = {}) {
    this.配置 = 语言形式配置Schema.parse(配置)
  }

  public 同步剖析文章(输入: 语言形式输入): 语言形式篇章 {
    return new 语言形式篇章(输入, this.配置)
  }

  public 同步评估文本(文本: string, 目标: 语言形式生成目标): 语言形式契合度结果 {
    let 篇章 = this.同步剖析文章({ 文本 })
    return 目标.评估篇章(篇章)
  }
}
