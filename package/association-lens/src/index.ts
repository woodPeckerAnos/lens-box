import { 智能体, type 智能体回调 } from '@lsby/ai-agent'
import type OpenAI from 'openai'
import { z } from 'zod'
import { 创建结果校验Schema } from './analysis/evidence.js'
import { 联想观察系统提示 } from './analysis/prompt.js'
import { 联想篇章 } from './model/discourse.js'
import { 联想观察结果Schema, 联想观察输入, 联想观察输入Schema } from './schema.js'

export * from './model/corpus.js'
export * from './model/discourse.js'
export * from './model/relation.js'
export * from './schema.js'

export type 联想透镜配置 = {
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
export type 联想观察执行选项 = { 中断信号?: AbortSignal }
let 默认空回调: 智能体回调 = async (): Promise<void> => {}
let 配置Schema = z.object({
  模型名称: z.string().refine((值) => 值.trim().length > 0, '模型名称不能为空'),
  最大校验重试次数: z.number().int().min(0).max(100).optional(),
  温度: z.number().finite().min(0).max(2).optional(),
  最大输出token: z.number().int().positive().optional(),
  是否支持函数调用: z.boolean().optional(),
  是否使用引导前缀: z.boolean().optional(),
})

/**
 * 联想透镜以外部模型观察文本中对象之间的联想连接。
 * 它记录模型配置与结构化约束，将原文定位和图关系校验反馈给模型重试，并产出可查询的联想篇章。
 */
export class 联想透镜 {
  private readonly 配置: 联想透镜配置
  private readonly 智能体实例: 智能体

  public constructor(配置: 联想透镜配置) {
    配置Schema.parse(配置)
    this.配置 = { ...配置 }
    let 重试 = 配置.最大校验重试次数 ?? 3
    this.智能体实例 = new 智能体({
      系统提示词: 联想观察系统提示,
      最大校验重试次数: 重试,
      最大循环轮次: 重试 + 2,
      ...(配置.额外请求参数 !== undefined ? { 额外请求参数: structuredClone(配置.额外请求参数) } : {}),
    })
  }

  public 构建联想观察命令(原始输入: 联想观察输入): string {
    let 输入 = 联想观察输入Schema.parse(原始输入)
    return JSON.stringify({ 原文: 输入.文本, 上下文提示: 输入.上下文提示 ?? null })
  }

  public async 观察(原始输入: 联想观察输入, 执行选项: 联想观察执行选项 = {}): Promise<联想篇章> {
    let 输入 = 联想观察输入Schema.parse(原始输入)
    执行选项.中断信号?.throwIfAborted()
    let 配置 = this.配置
    let 校验Schema = 创建结果校验Schema(输入.文本)
    let 回合 = await this.智能体实例.执行回合({
      命令: this.构建联想观察命令(输入),
      预期结果Schema: 联想观察结果Schema,
      预期结果描述: '文本联想节点、有向关系及逐字原文证据；没有联想时明确说明',
      结果验证器: async (结果): Promise<{ 通过: true } | { 通过: false; 错误信息: string }> => {
        let 校验 = 校验Schema.safeParse(结果)
        if (校验.success === false) return { 通过: false, 错误信息: 校验.error.message }
        return { 通过: true }
      },
      回调: 配置.回调 ?? 默认空回调,
      openai客户端: 配置.openai客户端,
      模型名称: 配置.模型名称,
      ...(配置.是否支持函数调用 !== undefined ? { 是否支持函数调用: 配置.是否支持函数调用 } : {}),
      ...(配置.是否使用引导前缀 !== undefined ? { 是否使用引导前缀: 配置.是否使用引导前缀 } : {}),
      ...(配置.温度 !== undefined ? { 温度: 配置.温度 } : {}),
      ...(配置.最大输出token !== undefined ? { 最大输出token: 配置.最大输出token } : {}),
      ...(执行选项.中断信号 !== undefined ? { 中断信号: 执行选项.中断信号 } : {}),
    })
    执行选项.中断信号?.throwIfAborted()
    if (回合.结果 === null) throw new Error(`联想观察未获得有效结果（结束原因：${回合.结束原因 ?? '未知'}）`)
    return 联想篇章.从观察结果创建(输入.文本, 回合.结果, {
      篇章标识: globalThis.crypto.randomUUID(),
      模型名称: 配置.模型名称,
      记录时间戳: Date.now(),
      来源标签: 输入.来源标签 ?? null,
    })
  }
}
