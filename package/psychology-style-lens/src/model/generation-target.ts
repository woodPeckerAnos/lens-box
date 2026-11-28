import { z } from 'zod'
import { 心理学观察结果, 权力位阶Schema, 社交距离Schema } from '../schema.js'
import type { 心理学文风样本 } from './sample.js'

/**
 * 心理学视角下的生成目标快照 Schema（所有字段均可选，支持按需组合约束）。
 */
export let 心理学生成目标快照Schema = z
  .object({
    社交距离: 社交距离Schema.optional(),
    权力位阶: 权力位阶Schema.optional(),
    主导特质: z.array(z.string().trim().min(1)).min(1).optional(),
    情绪基调: z.string().trim().min(1).optional(),
    表达动机: z.string().trim().min(1).optional(),
    防御或互动姿态: z.string().trim().min(1).optional(),
    场景类型: z.string().trim().min(1).optional(),
    气氛张力: z.string().trim().min(1).optional(),
  })
  .strict()

export type 心理学生成目标快照 = z.infer<typeof 心理学生成目标快照Schema>

export type 心理学契合度结果 = { 总分: number; 命中项: string[]; 偏离项: string[]; 观察结果: 心理学观察结果 }

function 文本包含关键词(源文本: string, 关键词: string): boolean {
  let 清理词 = 关键词.trim()
  if (清理词 === '') return false
  return 源文本.includes(清理词)
}

/**
 * 心理学生成目标代表在心理学视角下为文本生成设定的目标人格与场景尺度。
 * 当中记录了目标的社交距离、权力位阶、主导特质、情绪基调、表达动机、互动姿态以及对话场景约束。
 * 可以通过它将心理目标编译为面向模型的写作约束指令，或用来评估已剖析的心理学文风样本是否贴合预期。
 */
export class 心理学生成目标 {
  public static 从快照恢复(原始快照: unknown): 心理学生成目标 {
    return new 心理学生成目标(心理学生成目标快照Schema.parse(原始快照))
  }

  private readonly 快照值: 心理学生成目标快照

  public constructor(原始目标: 心理学生成目标快照) {
    let 校验后 = 心理学生成目标快照Schema.parse(原始目标)
    this.快照值 = { ...校验后, ...(校验后.主导特质 !== undefined ? { 主导特质: [...校验后.主导特质] } : {}) }
  }

  public 导出快照(): 心理学生成目标快照 {
    return { ...this.快照值, ...(this.快照值.主导特质 !== undefined ? { 主导特质: [...this.快照值.主导特质] } : {}) }
  }

  public 构建约束指令(): string {
    let 目标 = this.快照值
    let 约束行: string[] = ['【心理学表达约束】']

    if (目标.社交距离 !== undefined) 约束行.push(`- 社交距离：${目标.社交距离}`)
    if (目标.权力位阶 !== undefined) 约束行.push(`- 相对权力位阶：${目标.权力位阶}`)
    if (目标.主导特质 !== undefined) 约束行.push(`- 核心性格特质：${目标.主导特质.join('、')}`)
    if (目标.情绪基调 !== undefined) 约束行.push(`- 情绪底色：${目标.情绪基调}`)
    if (目标.表达动机 !== undefined) 约束行.push(`- 当下表达动机：${目标.表达动机}`)
    if (目标.防御或互动姿态 !== undefined) 约束行.push(`- 互动与心理防御姿态：${目标.防御或互动姿态}`)
    if (目标.场景类型 !== undefined) 约束行.push(`- 对话场景：${目标.场景类型}`)
    if (目标.气氛张力 !== undefined) 约束行.push(`- 气氛张力：${目标.气氛张力}`)

    if (约束行.length === 1) {
      约束行.push('- 保持鲜明且一致的人格视角与互动姿态，避免空洞的中立说教。')
    }
    return 约束行.join('\n')
  }

  public 评估样本(样本: 心理学文风样本): 心理学契合度结果 {
    let 观察结果 = 样本.导出快照()
    let 目标 = this.快照值
    let 命中项: string[] = []
    let 偏离项: string[] = []
    let 检查总数 = 0

    if (目标.社交距离 !== undefined) {
      检查总数 += 1
      if (样本.获得社交距离() === 目标.社交距离) {
        命中项.push(`社交距离(${目标.社交距离})`)
      } else {
        偏离项.push(`社交距离期望 ${目标.社交距离}，实测 ${样本.获得社交距离()}`)
      }
    }

    if (目标.权力位阶 !== undefined) {
      检查总数 += 1
      if (样本.获得权力位阶() === 目标.权力位阶) {
        命中项.push(`权力位阶(${目标.权力位阶})`)
      } else {
        偏离项.push(`权力位阶期望 ${目标.权力位阶}，实测 ${样本.获得权力位阶()}`)
      }
    }

    if (目标.主导特质 !== undefined) {
      检查总数 += 1
      let 命中 = 目标.主导特质.some((特质) => 样本.匹配性格特质(特质))
      if (命中 === true) {
        命中项.push(`主导特质(${目标.主导特质.join('、')})`)
      } else {
        偏离项.push(`主导特质期望包含 ${目标.主导特质.join('/')}，实测 ${样本.获得主导特质().join('、')}`)
      }
    }

    if (目标.情绪基调 !== undefined) {
      检查总数 += 1
      if (文本包含关键词(观察结果.人物性格.情绪基调, 目标.情绪基调)) {
        命中项.push(`情绪基调(${目标.情绪基调})`)
      } else {
        偏离项.push(`情绪基调期望偏“${目标.情绪基调}”，实测“${观察结果.人物性格.情绪基调}”`)
      }
    }

    if (目标.防御或互动姿态 !== undefined) {
      检查总数 += 1
      if (文本包含关键词(观察结果.人物性格.防御或互动姿态, 目标.防御或互动姿态)) {
        命中项.push(`互动姿态(${目标.防御或互动姿态})`)
      } else {
        偏离项.push(`互动姿态期望偏“${目标.防御或互动姿态}”，实测“${观察结果.人物性格.防御或互动姿态}”`)
      }
    }

    let 总分 = 检查总数 === 0 ? 1 : Number((命中项.length / 检查总数).toFixed(3))
    return { 总分, 命中项, 偏离项, 观察结果: { 人物性格: 观察结果.人物性格, 对话场景: 观察结果.对话场景 } }
  }
}
