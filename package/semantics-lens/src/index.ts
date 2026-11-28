import { 切分文章片段, 提取中文实词与总词数, 默认中文停用词集合 } from './lexical/text-tools.js'
import { 概念共现图 } from './model/cooccurrence-graph.js'
import { 语义篇章 } from './model/discourse.js'
import { 语义契合度结果, 语义生成目标 } from './model/generation-target.js'
import { 语义单元 } from './model/unit.js'
import { 语义剖析输入, 语义剖析输入Schema, 语义单元快照 } from './schema.js'

export * from './corpus-stats.js'
export * from './model/cooccurrence-graph.js'
export * from './model/discourse.js'
export * from './model/generation-target.js'
export * from './model/unit.js'
export * from './schema.js'

/**
 * 自定义分词函数类型：将原始片段文本切分为词项列表。
 */
export type 分词函数 = (文本: string) => string[]

/**
 * 可选的向量化函数类型：将文本片段列表批量映射为语义向量（例如接本地 ONNX 或外部 Embedding）。
 */
export type 向量化函数 = (文本列表: string[]) => Promise<number[][]>

/**
 * 构造语义学透镜所需的配置选项。
 */
export type 语义学透镜配置 = {
  分词器?: 分词函数
  停用词集合?: ReadonlySet<string>
  共现窗口大小?: number
  默认切分粒度?: '句子' | '段落'
  向量化函数?: 向量化函数
}

/**
 * 语义学透镜是从分布语义学与篇章连贯度视角剖析文章的无状态非大模型认知工具。
 * 里面组合了分词器、停用词表、共现窗口策略以及可选的向量化通道。
 * 主要负责将原始文章切分并构建为充血的语义篇章对象。
 */
export class 语义学透镜 {
  private readonly 自定义分词器: 分词函数 | undefined
  private readonly 停用词集合: ReadonlySet<string>
  private readonly 共现窗口大小: number
  private readonly 默认切分粒度: '句子' | '段落'
  private readonly 向量化函数: 向量化函数 | undefined

  public constructor(配置?: 语义学透镜配置) {
    let 共现窗口 = 配置?.共现窗口大小 ?? 4
    if (共现窗口 < 2) {
      throw new Error('共现窗口大小至少为 2')
    }
    this.自定义分词器 = 配置?.分词器
    this.停用词集合 = 配置?.停用词集合 ?? 默认中文停用词集合
    this.共现窗口大小 = 共现窗口
    this.默认切分粒度 = 配置?.默认切分粒度 ?? '句子'
    this.向量化函数 = 配置?.向量化函数
  }

  /**
   * 在不触发异步向量化的纯本地模式下，同步剖析文章并返回语义篇章。
   */
  public 同步剖析文章(原始输入: 语义剖析输入): 语义篇章 {
    if (this.向量化函数 !== undefined) {
      throw new Error('当前透镜配置了异步向量化函数，请改用异步方法 剖析文章()')
    }
    let 输入 = 语义剖析输入Schema.parse(原始输入)
    let { 单元列表 } = this.切分并分词(输入.文本, 输入.切分粒度 ?? this.默认切分粒度)
    return this.构建篇章(输入, 单元列表)
  }

  /**
   * 剖析文章并返回语义篇章；若配置了向量化函数则自动批量计算各语义单元的向量。
   */
  public async 剖析文章(原始输入: 语义剖析输入): Promise<语义篇章> {
    let 输入 = 语义剖析输入Schema.parse(原始输入)
    let { 片段列表, 单元快照草稿 } = this.切分并分词(输入.文本, 输入.切分粒度 ?? this.默认切分粒度)

    let 向量列表: number[][] | null = null
    if (this.向量化函数 !== undefined) {
      let 待向量化文本 = 片段列表.map((片段) => 片段.原文)
      向量列表 = await this.向量化函数(待向量化文本)
      if (向量列表.length !== 片段列表.length) {
        throw new Error(
          `向量化函数返回的向量数量与片段数量不匹配：${String(向量列表.length)} !== ${String(片段列表.length)}`,
        )
      }
    }

    let 单元列表 = 单元快照草稿.map((草稿, 索引) => {
      let 对应向量 = 向量列表 !== null ? (向量列表[索引] ?? null) : null
      return new 语义单元({ ...草稿, 向量: 对应向量 })
    })

    return this.构建篇章(输入, 单元列表)
  }

  private 切分并分词(
    文本: string,
    切分粒度: '句子' | '段落',
  ): {
    片段列表: Array<{ 序号: number; 段落序号: number; 原文: string }>
    单元快照草稿: 语义单元快照[]
    单元列表: 语义单元[]
  } {
    let 片段列表 = 切分文章片段(文本, 切分粒度)
    if (片段列表.length === 0) {
      throw new Error('未能从输入文本中切分出任何有效语义单元')
    }

    let 单元快照草稿: 语义单元快照[] = 片段列表.map((片段) => {
      if (this.自定义分词器 !== undefined) {
        let 全部词 = this.自定义分词器(片段.原文)
        let 实词序列 = 全部词.filter((词) => this.停用词集合.has(词) === false)
        return {
          序号: 片段.序号,
          段落序号: 片段.段落序号,
          原文: 片段.原文,
          总词数: 全部词.length,
          实词序列,
          向量: null,
        }
      }

      let { 总词数, 实词序列 } = 提取中文实词与总词数(片段.原文, this.停用词集合)
      return { 序号: 片段.序号, 段落序号: 片段.段落序号, 原文: 片段.原文, 总词数, 实词序列, 向量: null }
    })

    let 单元列表 = 单元快照草稿.map((草稿) => new 语义单元(草稿))
    return { 片段列表, 单元快照草稿, 单元列表 }
  }

  private 构建篇章(输入: 语义剖析输入, 单元列表: readonly 语义单元[]): 语义篇章 {
    let 共现图 = 概念共现图.从语义单元构建(单元列表, this.共现窗口大小)
    return new 语义篇章({
      篇章标识: globalThis.crypto.randomUUID(),
      原文: 输入.文本,
      单元们: 单元列表.map((单元) => 单元.导出快照()),
      共现图: 共现图.导出快照(),
      记录时间戳: Date.now(),
      来源标签: 输入.来源标签 ?? null,
    })
  }

  /**
   * 纯本地评估候选生成文本与语义目标设定的契合度。
   */
  public 同步评估文本(文本: string, 目标: 语义生成目标): 语义契合度结果 {
    let 篇章 = this.同步剖析文章({ 文本 })
    return 目标.评估篇章(篇章)
  }
}
