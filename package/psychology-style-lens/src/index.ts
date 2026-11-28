import { 智能体, type 智能体回调 } from '@lsby/ai-agent'
import type OpenAI from 'openai'
import { 心理学契合度结果, 心理学生成目标 } from './model/generation-target.js'
import { 心理学文风样本 } from './model/sample.js'
import { 心理学观察结果Schema, 心理学观察输入, 心理学观察输入Schema } from './schema.js'

export * from './model/generation-target.js'
export * from './model/sample.js'
export * from './schema.js'

/**
 * 构造心理学文风透镜所需的外部依赖与模型配置。
 */
export type 心理学文风透镜配置 = {
  openai客户端: OpenAI
  模型名称: string
  是否支持函数调用?: boolean
  是否使用引导前缀?: boolean
  最大校验重试次数?: number
  温度?: number
  最大输出token?: number
  额外请求参数?: Record<string, unknown>
  回调?: 智能体回调
}

/**
 * 单次观察时的附加控制选项。
 */
export type 心理学观察执行选项 = { 中断信号?: AbortSignal }

let 默认空回调: 智能体回调 = async (): Promise<void> => {}

/**
 * 心理学文风透镜是从心理学视角观察文本的无状态认知工具。
 * 内部基于 `@lsby/ai-agent` 驱动结构化提取与自动校验修复。
 * 主要负责对输入例句发起心理学剖析，并生成心理学文风样本。
 */
export class 心理学文风透镜 {
  private readonly openai客户端: OpenAI
  private readonly 模型名称: string
  private readonly 智能体实例: 智能体
  private readonly 是否支持函数调用: boolean | undefined
  private readonly 是否使用引导前缀: boolean | undefined
  private readonly 温度: number | undefined
  private readonly 最大输出token: number | undefined
  private readonly 回调: 智能体回调

  public constructor(配置: 心理学文风透镜配置) {
    this.openai客户端 = 配置.openai客户端
    this.模型名称 = 配置.模型名称
    this.是否支持函数调用 = 配置.是否支持函数调用
    this.是否使用引导前缀 = 配置.是否使用引导前缀
    this.温度 = 配置.温度
    this.最大输出token = 配置.最大输出token
    this.回调 = 配置.回调 ?? 默认空回调

    let 最大校验重试次数 = 配置.最大校验重试次数 ?? 3
    this.智能体实例 = new 智能体({
      系统提示词: [
        '你是一名精通人格心理学与话语分析的观察者。',
        '请仅从心理学视角剖析用户提供的例句，理解“什么性格的人在什么心理场景下会这样说话”。',
        '要求：',
        '1. 不要分析修辞手法或字数长短，专注心理动机、性格特质与人际关系张力。',
        '2. 人物性格与对话场景的各个字段必须紧扣例句的心理与人际语境，不要泛泛而谈。',
      ].join('\n'),
      最大校验重试次数,
      // 为校验失败重试预留充足循环轮次，同时避免无工具场景下的无效长循环
      最大循环轮次: 最大校验重试次数 + 2,
      ...(配置.额外请求参数 !== undefined ? { 额外请求参数: 配置.额外请求参数 } : {}),
    })
  }

  public async 观察(原始输入: 心理学观察输入, 执行选项?: 心理学观察执行选项): Promise<心理学文风样本> {
    let 输入 = 心理学观察输入Schema.parse(原始输入)
    let 命令 = this.构建心理学观察命令(输入)

    let 回合结果 = await this.智能体实例.执行回合({
      命令,
      预期结果Schema: 心理学观察结果Schema,
      预期结果描述: '从心理学视角剖析例句后得出的人物性格画像与对话场景环境',
      回调: this.回调,
      openai客户端: this.openai客户端,
      模型名称: this.模型名称,
      ...(this.是否支持函数调用 !== undefined ? { 是否支持函数调用: this.是否支持函数调用 } : {}),
      ...(this.是否使用引导前缀 !== undefined ? { 是否使用引导前缀: this.是否使用引导前缀 } : {}),
      ...(this.温度 !== undefined ? { 温度: this.温度 } : {}),
      ...(this.最大输出token !== undefined ? { 最大输出token: this.最大输出token } : {}),
      ...(执行选项?.中断信号 !== undefined ? { 中断信号: 执行选项.中断信号 } : {}),
    })

    if (回合结果.结果 === null) {
      let 原因 = 回合结果.结束原因 ?? '未知原因'
      throw new Error(`心理学观察未能获得有效结构化结果（结束原因: ${原因}）`)
    }

    return new 心理学文风样本({
      样本标识: globalThis.crypto.randomUUID(),
      原文: 输入.文本,
      人物性格: 回合结果.结果.人物性格,
      对话场景: 回合结果.结果.对话场景,
      记录时间戳: Date.now(),
      来源标签: 输入.来源标签 ?? null,
    })
  }

  /**
   * 构造发送给智能体的心理学观察用户指令。
   */
  public 构建心理学观察命令(原始输入: 心理学观察输入): string {
    let 输入 = 心理学观察输入Schema.parse(原始输入)
    let 上下文段落 =
      输入.上下文提示 !== undefined && 输入.上下文提示 !== null ? `\n补充上下文：${输入.上下文提示}\n` : ''

    return [上下文段落, '待分析例句：', `"""\n${输入.文本}\n"""`].filter((段落) => 段落.length > 0).join('\n')
  }

  /**
   * 评估候选生成文本与心理学目标设定的契合度。
   */
  public async 评估生成文本(
    文本: string,
    目标: 心理学生成目标,
    执行选项?: 心理学观察执行选项,
  ): Promise<心理学契合度结果> {
    let 样本 = await this.观察({ 文本 }, 执行选项)
    return 目标.评估样本(样本)
  }
}
