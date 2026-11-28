import { z } from 'zod'
import type { 语言形式篇章 } from './discourse.js'

export let 句长倾向Schema = z.enum(['极短碎句', '短句为主', '长短交错', '绵密长句'])
export type 句长倾向 = z.infer<typeof 句长倾向Schema>

export let 虚词密度倾向Schema = z.enum(['极低', '偏低', '适中', '偏高'])
export type 虚词密度倾向 = z.infer<typeof 虚词密度倾向Schema>

export let 停顿节奏倾向Schema = z.enum(['高频逗号急促', '短促句号利落', '反问感叹多', '波澜不惊'])
export type 停顿节奏倾向 = z.infer<typeof 停顿节奏倾向Schema>

export let 默认禁用AI腔模式: readonly string[] = [
  '不是……而是',
  '稳稳地',
  '稳稳托住',
  '值得一提的是',
  '某种意义上',
  '本质上',
  '仿佛在说',
]

export let 语言形式生成目标快照Schema = z
  .object({
    句长倾向: 句长倾向Schema.optional(),
    虚词密度倾向: 虚词密度倾向Schema.optional(),
    停顿节奏倾向: 停顿节奏倾向Schema.optional(),
    禁用模式: z.array(z.string().trim().min(1)).optional(),
  })
  .strict()

export type 语言形式生成目标快照 = z.infer<typeof 语言形式生成目标快照Schema>

export type 语言形式实测指标 = {
  平均句长: number
  句长标准差: number
  虚词占比: number
  问叹号占比: number
  逗号句号比: number
  踩中禁用模式: string[]
}

export type 语言形式契合度结果 = { 总分: number; 命中项: string[]; 偏离项: string[]; 实测指标: 语言形式实测指标 }

function 描述句长倾向(倾向: 句长倾向): string {
  switch (倾向) {
    case '极短碎句':
      return '极短碎句（单句尽量控制在 4~12 字，多用短促停顿，干脆利落）'
    case '短句为主':
      return '短句为主（单句大致控制在 10~20 字，少套叠修饰语）'
    case '长短交错':
      return '长短交错（短句点睛与中等叙事句交替推进，富有呼吸感）'
    case '绵密长句':
      return '绵密长句（善用复合展开与递进从句，平均句长 24 字以上）'
  }
}

function 描述虚词密度(密度: 虚词密度倾向): string {
  switch (密度) {
    case '极低':
      return '虚词极低（大幅削减“的/了/呢/而且/因此/其实”，靠实词和动词硬朗推进）'
    case '偏低':
      return '虚词偏低（克制使用语气助词与过渡连词，文字凝练紧凑）'
    case '适中':
      return '虚词适中（保持自然的日常书面或口语连接度）'
    case '偏高':
      return '虚词偏高（适当保留“呢/啊/其实/不过/倒也”等口语连接与舒缓语气词）'
  }
}

function 描述停顿节奏(节奏: 停顿节奏倾向): string {
  switch (节奏) {
    case '高频逗号急促':
      return '高频逗号急促（句内分句密、逗号多，呈现连珠炮或思绪急转感）'
    case '短促句号利落':
      return '短促句号利落（一句一意，果断落句号，不拖泥带水）'
    case '反问感叹多':
      return '反问感叹多（善用“？”和“！”制造情绪起伏与质问张力）'
    case '波澜不惊':
      return '波澜不惊（以陈述句号为主，几乎不用感叹号，语调平静克制）'
  }
}

function 计算标准差(数值列表: number[], 均值: number): number {
  if (数值列表.length <= 1) return 0
  let 方差和 = 0
  for (let 值 of 数值列表) {
    方差和 += (值 - 均值) ** 2
  }
  return Math.sqrt(方差和 / 数值列表.length)
}

function 评估句长命中(平均句长: number, 标准差: number, 倾向: 句长倾向): boolean {
  switch (倾向) {
    case '极短碎句':
      return 平均句长 <= 14
    case '短句为主':
      return 平均句长 <= 22
    case '长短交错':
      return 平均句长 >= 10 && 平均句长 <= 30 && (标准差 >= 3 || 平均句长 >= 12)
    case '绵密长句':
      return 平均句长 >= 22
  }
}

function 评估虚词命中(虚词占比: number, 倾向: 虚词密度倾向): boolean {
  switch (倾向) {
    case '极低':
      return 虚词占比 <= 0.14
    case '偏低':
      return 虚词占比 <= 0.22
    case '适中':
      return 虚词占比 >= 0.12 && 虚词占比 <= 0.34
    case '偏高':
      return 虚词占比 >= 0.22
  }
}

function 评估停顿命中(指标: 语言形式实测指标, 节奏: 停顿节奏倾向): boolean {
  switch (节奏) {
    case '高频逗号急促':
      return 指标.逗号句号比 >= 1.2
    case '短促句号利落':
      return 指标.平均句长 <= 22 && 指标.逗号句号比 <= 1.5
    case '反问感叹多':
      return 指标.问叹号占比 >= 0.15
    case '波澜不惊':
      return 指标.问叹号占比 <= 0.15
  }
}

/**
 * 语言形式生成目标代表在表层语言形式视角下设定的文风节奏与句法尺度。
 * 当中记录了目标的句长倾向、虚词密度倾向、停顿节奏倾向与禁用句式模式。
 * 可以通过它将形式目标编译为面向写作模型的约束指令，或直接丈量已剖析的语言形式篇章是否达标。
 */
export class 语言形式生成目标 {
  public static 从快照恢复(原始快照: unknown): 语言形式生成目标 {
    return new 语言形式生成目标(语言形式生成目标快照Schema.parse(原始快照))
  }

  private readonly 快照值: 语言形式生成目标快照

  public constructor(原始目标: 语言形式生成目标快照) {
    let 校验后 = 语言形式生成目标快照Schema.parse(原始目标)
    this.快照值 = { ...校验后, ...(校验后.禁用模式 !== undefined ? { 禁用模式: [...校验后.禁用模式] } : {}) }
  }

  public 导出快照(): 语言形式生成目标快照 {
    return { ...this.快照值, ...(this.快照值.禁用模式 !== undefined ? { 禁用模式: [...this.快照值.禁用模式] } : {}) }
  }

  public 构建约束指令(): string {
    let 目标 = this.快照值
    let 约束行: string[] = ['【语言形式与节奏约束】']

    if (目标.句长倾向 !== undefined) 约束行.push(`- 句长控制：${描述句长倾向(目标.句长倾向)}`)
    if (目标.虚词密度倾向 !== undefined) 约束行.push(`- 虚实词比例：${描述虚词密度(目标.虚词密度倾向)}`)
    if (目标.停顿节奏倾向 !== undefined) 约束行.push(`- 停顿与标点：${描述停顿节奏(目标.停顿节奏倾向)}`)

    let 禁用列表 = 目标.禁用模式 ?? []
    if (禁用列表.length > 0) {
      约束行.push(`- 严格禁止出现以下套话或句式：${禁用列表.map((词) => `“${词}”`).join('、')}`)
    }

    if (约束行.length === 1) {
      约束行.push('- 保持自然清晰的中文句段节奏，避免僵硬套话。')
    }
    return 约束行.join('\n')
  }

  public 评估篇章(篇章: 语言形式篇章): 语言形式契合度结果 {
    let 目标 = this.快照值
    let 快照 = 篇章.导出快照()
    let 统计 = 快照.统计

    let 句长列表 = 快照.句长节奏.map((项) => 项.长度)
    let 句长总和 = 句长列表.reduce((总计, 值) => 总计 + 值, 0)
    let 平均句长 = 句长列表.length === 0 ? 0 : Number((句长总和 / 句长列表.length).toFixed(2))
    let 句长标准差 = Number(计算标准差(句长列表, 平均句长).toFixed(2))

    let 总词数 = 统计.词频.分母
    let 虚词总数 = 统计.虚词词项.项目.reduce((总计, 项) => 总计 + 项.次数, 0)
    let 虚词占比 = 总词数 === 0 ? 0 : Number((虚词总数 / 总词数).toFixed(3))

    let 标点总数 = 统计.标点分布.分母
    let 逗号次数 = 0
    let 句号次数 = 0
    let 问叹号次数 = 0
    for (let 项 of 统计.标点分布.项目) {
      let 标点 = 项.项[0]
      if (标点 === '，' || 标点 === ',') 逗号次数 += 项.次数
      else if (标点 === '。' || 标点 === '.') 句号次数 += 项.次数
      else if (标点 === '？' || 标点 === '?' || 标点 === '！' || 标点 === '!') 问叹号次数 += 项.次数
    }
    let 问叹号占比 = 标点总数 === 0 ? 0 : Number((问叹号次数 / 标点总数).toFixed(3))
    let 逗号句号比 = 句号次数 === 0 ? 逗号次数 : Number((逗号次数 / 句号次数).toFixed(2))

    let 原文 = 篇章.获得原文()
    let 禁用列表 = 目标.禁用模式 ?? []
    let 踩中禁用模式 = 禁用列表.filter((词) => 原文.includes(词))

    let 实测指标: 语言形式实测指标 = { 平均句长, 句长标准差, 虚词占比, 问叹号占比, 逗号句号比, 踩中禁用模式 }

    let 命中项: string[] = []
    let 偏离项: string[] = []
    let 检查项数 = 0

    if (目标.句长倾向 !== undefined) {
      检查项数 += 1
      if (评估句长命中(平均句长, 句长标准差, 目标.句长倾向) === true) {
        命中项.push(`句长倾向(${目标.句长倾向})`)
      } else {
        偏离项.push(`句长期望 ${目标.句长倾向}，实测平均 ${平均句长} 字`)
      }
    }

    if (目标.虚词密度倾向 !== undefined) {
      检查项数 += 1
      if (评估虚词命中(虚词占比, 目标.虚词密度倾向) === true) {
        命中项.push(`虚词密度(${目标.虚词密度倾向})`)
      } else {
        偏离项.push(`虚词密度期望 ${目标.虚词密度倾向}，实测占比 ${(虚词占比 * 100).toFixed(1)}%`)
      }
    }

    if (目标.停顿节奏倾向 !== undefined) {
      检查项数 += 1
      if (评估停顿命中(实测指标, 目标.停顿节奏倾向) === true) {
        命中项.push(`停顿节奏(${目标.停顿节奏倾向})`)
      } else {
        偏离项.push(`停顿节奏期望 ${目标.停顿节奏倾向}，实测问叹号占比 ${(问叹号占比 * 100).toFixed(1)}%`)
      }
    }

    if (禁用列表.length > 0) {
      检查项数 += 1
      if (踩中禁用模式.length === 0) {
        命中项.push('未踩中禁用套话')
      } else {
        偏离项.push(`踩中禁用词：${踩中禁用模式.join('、')}`)
      }
    }

    let 总分 = 检查项数 === 0 ? 1 : Number((命中项.length / 检查项数).toFixed(3))
    return { 总分, 命中项, 偏离项, 实测指标 }
  }
}
