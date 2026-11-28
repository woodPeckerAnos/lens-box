import { z } from 'zod'
import { 建立参照, 期望覆盖, type 参照桶 } from './reference.js'

let 文档列表 = z.array(z.string().refine((值) => 值.trim().length > 0, '文档不能为空')).min(2)
let 选项定义 = z
  .object({
    种子: z.number().int().min(0).max(0xffffffff).default(1),
    样本上限: z.number().int().min(1).max(100000).default(3000),
  })
  .strict()
let 表达定义 = z
  .string()
  .min(1)
  .refine((值) => 值.trim() === 值 && /[\r\n]/u.test(值) === false, '请使用单行且两端无空白的表达')

export type 抽样选项 = z.input<typeof 选项定义>
type 覆盖统计 = { 文档数: number; 总次数: number; 覆盖篇数: number; 分布: { 文档序号: number; 次数: number }[] }
export type 成团观察 = 覆盖统计 &
  (
    | { 状态: '未出现' | '出现不足三次' | '缺少参照'; 成团分数: null }
    | { 状态: '已校准'; 成团分数: number; 目标档位: number; 参照: 参照桶; 泊松期望篇数: number; 校准期望篇数: number }
  )

/**
 * 成团语料由一组已划分的文档和从中抽取的同频参照组成。
 * 在同一份语料上可以反复查询不同表达，查到出现分布以及相对参照的集中程度。
 */
export class 成团语料 {
  private readonly 文档: string[]
  private readonly 各桶: 参照桶[]

  public constructor(文档: readonly string[], 选项: 抽样选项 = {}) {
    this.文档 = 文档列表.parse(文档)
    let { 种子, 样本上限 } = 选项定义.parse(选项)
    this.各桶 = 建立参照(this.文档, 种子, 样本上限)
  }

  public 观察(表达: string): 成团观察 {
    表达定义.parse(表达)
    let 分布: 覆盖统计['分布'] = []
    let 总次数 = 0
    for (let [文档序号, 正文] of this.文档.entries()) {
      let 次数 = 0
      for (let 位 = 正文.indexOf(表达); 位 >= 0; 位 = 正文.indexOf(表达, 位 + 1)) 次数++
      if (次数 > 0) 分布.push({ 文档序号, 次数 })
      总次数 += 次数
    }
    let 基本 = { 文档数: this.文档.length, 总次数, 覆盖篇数: 分布.length, 分布 }
    if (总次数 === 0) return { ...基本, 状态: '未出现', 成团分数: null }
    if (总次数 < 3) return { ...基本, 状态: '出现不足三次', 成团分数: null }
    let 目标档位 = Math.floor(Math.log2(总次数))
    let 最近: 参照桶 | undefined
    for (let 桶 of this.各桶) {
      if (最近 === undefined || Math.abs(桶.档位 - 目标档位) < Math.abs(最近.档位 - 目标档位)) 最近 = 桶
    }
    if (最近 === undefined) return { ...基本, 状态: '缺少参照', 成团分数: null }
    let 泊松期望篇数 = 期望覆盖(基本.文档数, 总次数)
    let 校准期望篇数 = 泊松期望篇数 * 最近.覆盖比中位数
    return {
      ...基本,
      状态: '已校准',
      目标档位,
      参照: { ...最近 },
      泊松期望篇数,
      校准期望篇数,
      成团分数: Math.log(校准期望篇数 / 基本.覆盖篇数),
    }
  }
}
