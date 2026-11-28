import { z } from 'zod'
import { 联想模式统计, 联想篇章快照, 联想篇章快照Schema } from '../schema.js'
import { 联想篇章 } from './discourse.js'

/**
 * 联想语料是保留每篇观察差异的一组联想篇章。
 * 它包含各篇网络及其来源，按显式标签统计连接方式和源域到目标域，支持附原文位置的例证查询与快照恢复。
 */
export class 联想语料 {
  public static 从快照恢复(原始快照: unknown): 联想语料 {
    let 快照 = z
      .object({ 版本: z.literal('1'), 篇章: z.array(联想篇章快照Schema).min(1) })
      .strict()
      .parse(原始快照)
    return new 联想语料(快照.篇章.map((篇章) => 联想篇章.从快照恢复(篇章)))
  }
  private readonly 篇章: 联想篇章[]

  public constructor(篇章: readonly 联想篇章[]) {
    if (篇章.length === 0) throw new Error('联想语料至少需要一篇文章')
    let 标识 = 篇章.map((项) => 项.获得篇章标识())
    if (new Set(标识).size !== 标识.length) throw new Error('联想语料的篇章标识不能重复')
    this.篇章 = 篇章.map((项) => 联想篇章.从快照恢复(项.导出快照()))
  }

  public 获得篇数(): number {
    return this.篇章.length
  }
  public 统计连接方式(): 联想模式统计[] {
    return this.统计模式('连接方式')
  }
  public 统计领域转移(): 联想模式统计[] {
    return this.统计模式('领域转移')
  }
  public 获得各篇网络(): 联想篇章快照[] {
    return this.篇章.map((篇章) => 篇章.导出快照())
  }
  public 导出快照(): { 版本: '1'; 篇章: 联想篇章快照[] } {
    return { 版本: '1', 篇章: this.获得各篇网络() }
  }

  private 统计模式(维度: '连接方式' | '领域转移'): 联想模式统计[] {
    let 统计 = new Map<string, 联想模式统计>()
    for (let 篇章 of this.篇章) {
      let 快照 = 篇章.导出快照()
      for (let 关系 of 篇章.查询关系()) {
        let 边 = 关系.导出快照()
        let 标签: string[] = []
        switch (维度) {
          case '连接方式':
            标签 = [边.连接方式]
            break
          case '领域转移':
            标签 = [关系.获得源节点().领域, 关系.获得目标节点().领域]
            break
        }
        let 键 = JSON.stringify(标签)
        let 组 = 统计.get(键)
        if (组 === undefined) {
          组 = { 标签, 次数: 0, 篇数: 0, 例证: [] }
          统计.set(键, 组)
        }
        if (组.例证.some((例证) => 例证.篇章标识 === 快照.篇章标识) === false) 组.篇数 += 1
        组.次数 += 1
        组.例证.push({
          篇章标识: 快照.篇章标识,
          来源标签: 快照.来源标签,
          关系标识: 边.关系标识,
          证据: structuredClone(边.连接依据.证据),
        })
      }
    }
    return [...统计.values()].sort((甲, 乙) => 乙.次数 - 甲.次数)
  }
}
