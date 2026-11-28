import { z } from 'zod'
import type { 语义篇章 } from './discourse.js'

export let 语义语态视角Schema = z.enum(['第一人称口语', '第一人称自省', '第二人称对话', '第三人称冷眼旁观'])
export type 语义语态视角 = z.infer<typeof 语义语态视角Schema>

export let 语义修辞密度Schema = z.enum(['白描零修辞', '克制点缀', '比喻丰富', '密集意象'])
export type 语义修辞密度 = z.infer<typeof 语义修辞密度Schema>

export let 语义用词偏好Schema = z.enum(['大白话口语', '市井俗语', '书卷雅致', '冷硬术语', '文艺抽象'])
export type 语义用词偏好 = z.infer<typeof 语义用词偏好Schema>

export let 语义生成目标快照Schema = z
  .object({
    语态视角: 语义语态视角Schema.optional(),
    修辞密度: 语义修辞密度Schema.optional(),
    用词偏好: 语义用词偏好Schema.optional(),
    核心概念词: z.array(z.string().trim().min(1)).optional(),
    回避词: z.array(z.string().trim().min(1)).optional(),
  })
  .strict()

export type 语义生成目标快照 = z.infer<typeof 语义生成目标快照Schema>

export type 语义契合度结果 = {
  总分: number
  命中项: string[]
  偏离项: string[]
  平均信息密度: number
  核心概念命中列表: string[]
  踩中回避词列表: string[]
}

/**
 * 语义生成目标代表在语义学视角下设定的文本表达倾向与概念边界。
 * 当中记录了目标的语态视角、修辞密度、用词偏好、需要围绕的核心概念词以及需要回避的词语。
 * 可以通过它将语义目标编译为面向写作模型的约束指令，或评估已剖析的语义篇章是否符合概念约定。
 */
export class 语义生成目标 {
  public static 从快照恢复(原始快照: unknown): 语义生成目标 {
    return new 语义生成目标(语义生成目标快照Schema.parse(原始快照))
  }

  private readonly 快照值: 语义生成目标快照

  public constructor(原始目标: 语义生成目标快照) {
    let 校验后 = 语义生成目标快照Schema.parse(原始目标)
    this.快照值 = {
      ...校验后,
      ...(校验后.核心概念词 !== undefined ? { 核心概念词: [...校验后.核心概念词] } : {}),
      ...(校验后.回避词 !== undefined ? { 回避词: [...校验后.回避词] } : {}),
    }
  }

  public 导出快照(): 语义生成目标快照 {
    return {
      ...this.快照值,
      ...(this.快照值.核心概念词 !== undefined ? { 核心概念词: [...this.快照值.核心概念词] } : {}),
      ...(this.快照值.回避词 !== undefined ? { 回避词: [...this.快照值.回避词] } : {}),
    }
  }

  public 构建约束指令(): string {
    let 目标 = this.快照值
    let 约束行: string[] = ['【语义与表达视角约束】']

    if (目标.语态视角 !== undefined) 约束行.push(`- 叙述语态视角：${目标.语态视角}`)
    if (目标.修辞密度 !== undefined) 约束行.push(`- 修辞与意象密度：${目标.修辞密度}`)
    if (目标.用词偏好 !== undefined) 约束行.push(`- 词汇风格偏好：${目标.用词偏好}`)

    let 核心词 = 目标.核心概念词 ?? []
    if (核心词.length > 0) {
      约束行.push(`- 尽量围绕或自然带出以下核心概念：${核心词.join('、')}`)
    }

    let 回避词 = 目标.回避词 ?? []
    if (回避词.length > 0) {
      约束行.push(`- 避免使用以下词语：${回避词.join('、')}`)
    }

    if (约束行.length === 1) {
      约束行.push('- 保持语义聚焦与画面具体感，避免空泛抽象的总结句。')
    }
    return 约束行.join('\n')
  }

  public 评估篇章(篇章: 语义篇章): 语义契合度结果 {
    let 目标 = this.快照值
    let 原文 = 篇章.获得原文()
    let 平均信息密度 = Number(篇章.评估平均信息密度().toFixed(3))

    let 核心词 = 目标.核心概念词 ?? []
    let 核心概念命中列表 = 核心词.filter((词) => 篇章.是否包含概念(词) || 原文.includes(词))

    let 回避词 = 目标.回避词 ?? []
    let 踩中回避词列表 = 回避词.filter((词) => 原文.includes(词))

    let 命中项: string[] = []
    let 偏离项: string[] = []
    let 检查项数 = 0

    if (核心词.length > 0) {
      检查项数 += 1
      if (核心概念命中列表.length > 0) {
        命中项.push(`核心概念(${核心概念命中列表.join('、')})`)
      } else {
        偏离项.push(`未命中指定核心概念：${核心词.join('、')}`)
      }
    }

    if (回避词.length > 0) {
      检查项数 += 1
      if (踩中回避词列表.length === 0) {
        命中项.push('未踩中回避词')
      } else {
        偏离项.push(`踩中回避词：${踩中回避词列表.join('、')}`)
      }
    }

    let 总分 = 检查项数 === 0 ? 1 : Number((命中项.length / 检查项数).toFixed(3))
    return { 总分, 命中项, 偏离项, 平均信息密度, 核心概念命中列表, 踩中回避词列表 }
  }
}
