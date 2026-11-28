import { 提取形式词项 } from '../analysis/lexical.js'
import { 切分句子, 切分段落 } from '../analysis/text-segmentation.js'
import {
  语言形式对比,
  语言形式篇章快照,
  语言形式篇章快照Schema,
  语言形式统计,
  语言形式输入,
  语言形式输入Schema,
  语言形式配置,
  语言形式配置Schema,
} from '../schema.js'
import { 对比统计, 校验配置相同 } from '../statistics/distribution.js'
import { 创建句长节奏, 创建段长节奏, 编制篇章统计 } from '../statistics/text-statistics.js'

/**
 * 语言形式篇章是一篇原文及其可定位的表面语言形式记录。
 * 它包含按原文排列的句段、带词性的词项、计数分布与长度节奏，维护这些记录与原文的一致性。
 * 支持导出独立快照、恢复校验以及与相同配置的另一篇文章逐维比较。
 */
export class 语言形式篇章 {
  public static 从快照恢复(原始快照: unknown): 语言形式篇章 {
    let 快照 = 语言形式篇章快照Schema.parse(原始快照)
    let 篇章 = new 语言形式篇章({ 文本: 快照.原文, 来源标签: 快照.来源标签 }, 快照.配置)
    if (JSON.stringify(篇章.快照) !== JSON.stringify(快照)) {
      throw new Error('语言形式篇章快照与重新分析结果不一致：原文位置、次序、组合或统计可能被修改')
    }
    return 篇章
  }
  private readonly 快照: 语言形式篇章快照

  public constructor(原始输入: 语言形式输入, 原始配置: 语言形式配置 = {}) {
    let 输入 = 语言形式输入Schema.parse(原始输入)
    let 配置 = 语言形式配置Schema.parse(原始配置)
    let 段落 = 切分段落(输入.文本)
    let 句子 = 切分句子(输入.文本, 段落)
    let 词项 = 提取形式词项(输入.文本, 句子)
    let 句长节奏 = 创建句长节奏(句子)
    let 段长节奏 = 创建段长节奏(段落)
    this.快照 = {
      算法版本: '1',
      配置,
      原文: 输入.文本,
      来源标签: 输入.来源标签,
      段落,
      句子,
      词项,
      句长节奏,
      段长节奏,
      统计: 编制篇章统计(输入.文本, 句子, 词项, 句长节奏, 段长节奏, 配置),
    }
  }

  public 获得原文(): string {
    return this.快照.原文
  }

  public 获得统计(): 语言形式统计 {
    return structuredClone(this.快照.统计)
  }

  public 对比另一篇章(另一篇章: 语言形式篇章): 语言形式对比 {
    校验配置相同(this.快照.配置, 另一篇章.快照.配置)
    return 对比统计(this.快照.统计, 另一篇章.快照.统计)
  }

  public 导出快照(): 语言形式篇章快照 {
    return structuredClone(this.快照)
  }
}
