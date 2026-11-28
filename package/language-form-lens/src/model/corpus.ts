import { 语言形式对比, 语言形式统计, 语言形式语料快照, 语言形式语料快照Schema } from '../schema.js'
import { 合并统计, 对比统计, 校验配置相同, 重定位统计 } from '../statistics/distribution.js'
import { 语言形式篇章 } from './discourse.js'

/**
 * 语言形式语料是使用相同分析配置观察的一组篇章。
 * 它保留各篇原文和节奏次序，并以出现次数和实际分母形成整体分布。
 * 支持样本数查询、汇总快照、恢复校验及语料之间的逐维比较。
 */
export class 语言形式语料 {
  public static 从快照恢复(原始快照: unknown): 语言形式语料 {
    let 快照 = 语言形式语料快照Schema.parse(原始快照)
    let 语料 = new 语言形式语料(快照.篇章.map((项) => 语言形式篇章.从快照恢复(项)))
    if (JSON.stringify(语料.快照) !== JSON.stringify(快照)) throw new Error('语料快照与篇章计数聚合结果不一致')
    return 语料
  }
  private readonly 快照: 语言形式语料快照

  public constructor(篇章们: readonly 语言形式篇章[]) {
    let 篇章 = 篇章们.map((项) => 项.导出快照())
    let 首篇 = 篇章[0]
    if (首篇 === undefined) throw new Error('语言形式语料至少需要一篇文章')
    for (let 项 of 篇章) 校验配置相同(首篇.配置, 项.配置)
    this.快照 = {
      算法版本: '1',
      配置: { ...首篇.配置 },
      样本数: 篇章.length,
      篇章,
      统计: 合并统计(
        篇章.map((项, 序号) => 重定位统计(项.统计, 序号)),
        首篇.配置.每项例证上限,
      ),
      句长节奏: 篇章.map((项, 序号) =>
        项.句长节奏.map((节奏) => ({ ...节奏, 例证: { ...节奏.例证, 篇章序号: 序号 } })),
      ),
      段长节奏: 篇章.map((项, 序号) =>
        项.段长节奏.map((节奏) => ({ ...节奏, 例证: { ...节奏.例证, 篇章序号: 序号 } })),
      ),
    }
  }

  public 获得样本数(): number {
    return this.快照.样本数
  }

  public 获得统计(): 语言形式统计 {
    return structuredClone(this.快照.统计)
  }

  public 对比另一语料(另一语料: 语言形式语料): 语言形式对比 {
    校验配置相同(this.快照.配置, 另一语料.快照.配置)
    return 对比统计(this.快照.统计, 另一语料.快照.统计)
  }

  public 导出快照(): 语言形式语料快照 {
    return structuredClone(this.快照)
  }
}
