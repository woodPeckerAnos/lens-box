import { z } from 'zod'
import { 校验观察结果, 转换定位结果 } from '../analysis/evidence.js'
import {
  定位关系,
  定位观察结果,
  联想关系查询,
  联想篇章快照,
  联想篇章快照Schema,
  联想观察结果,
  联想记录信息,
  联想链查询,
} from '../schema.js'
import { 联想关系 } from './relation.js'

/**
 * 联想篇章是一篇原文及其有证据支撑的联想网络。
 * 它保留完整文本与观察来源，维护节点、关系、引用位置的一致性，并支持网络查询、有界链条遍历和快照恢复。
 */
export class 联想篇章 {
  public static 从观察结果创建(原文: string, 结果: 联想观察结果, 记录: 联想记录信息): 联想篇章 {
    return new 联想篇章({
      版本: '1',
      原文,
      观察结果: 转换定位结果(原文, 结果),
      篇章标识: 记录.篇章标识,
      模型名称: 记录.模型名称,
      记录时间戳: 记录.记录时间戳,
      来源标签: 记录.来源标签,
    })
  }
  public static 从快照恢复(快照: unknown): 联想篇章 {
    return new 联想篇章(联想篇章快照Schema.parse(快照))
  }
  private readonly 快照: 联想篇章快照
  private readonly 关系: 联想关系[]

  public constructor(原始快照: 联想篇章快照) {
    let 快照 = 联想篇章快照Schema.parse(原始快照)
    校验观察结果(快照.原文, 快照.观察结果)
    this.快照 = 快照
    this.关系 = 快照.观察结果.关系.map((关系) => {
      let 源 = 快照.观察结果.节点.find((节点) => 节点.节点标识 === 关系.源节点)
      let 目标 = 快照.观察结果.节点.find((节点) => 节点.节点标识 === 关系.目标节点)
      if (源 === undefined || 目标 === undefined) throw new Error('联想关系缺少节点')
      return new 联想关系(快照.原文, 关系, 源, 目标)
    })
  }

  public 获得篇章标识(): string {
    return this.快照.篇章标识
  }
  public 获得原文(): string {
    return this.快照.原文
  }
  public 查询关系(条件: 联想关系查询 = {}): 联想关系[] {
    return this.关系.filter((关系) => 关系.匹配(条件))
  }
  public 获得关系网络(): 定位观察结果 {
    return structuredClone(this.快照.观察结果)
  }

  public 获得联想链(条件: 联想链查询): 定位关系[][] {
    let 校验后 = z
      .object({
        起始节点: z.string().min(1),
        最大深度: z.number().int().min(1).max(100).default(10),
        最大链数: z.number().int().min(1).max(10000).default(100),
      })
      .strict()
      .parse(条件)
    if (this.快照.观察结果.节点.some((节点) => 节点.节点标识 === 校验后.起始节点) === false) {
      throw new Error(`起始节点不存在：${校验后.起始节点}`)
    }
    let 链们: 定位关系[][] = []
    let 遍历 = (节点: string, 路径: 定位关系[], 已用边: Set<string>): void => {
      if (链们.length >= 校验后.最大链数) return
      let 后续 = this.快照.观察结果.关系.filter((边) => 边.源节点 === 节点 && 已用边.has(边.关系标识) === false)
      if (路径.length >= 校验后.最大深度 || 后续.length === 0) {
        if (路径.length > 0) 链们.push(structuredClone(路径))
        return
      }
      for (let 边 of 后续) {
        if (链们.length >= 校验后.最大链数) return
        遍历(边.目标节点, [...路径, 边], new Set([...已用边, 边.关系标识]))
      }
    }
    遍历(校验后.起始节点, [], new Set())
    return 链们
  }

  public 导出快照(): 联想篇章快照 {
    return structuredClone(this.快照)
  }
}
