import { 校验观察结果 } from '../analysis/evidence.js'
import { 定位关系, 定位关系Schema, 定位节点, 定位节点Schema, 联想关系查询 } from '../schema.js'

/**
 * 联想关系是一篇文字中从触发物通向另一对象的定向连接。
 * 它结合两端节点、连接方式、表达作用与后文证据，支持按方向和方式查询及独立导出。
 */
export class 联想关系 {
  private readonly 数据: 定位关系
  private readonly 源: 定位节点
  private readonly 目标: 定位节点

  public constructor(原文: string, 数据: 定位关系, 源: 定位节点, 目标: 定位节点) {
    this.数据 = 定位关系Schema.parse(数据)
    this.源 = 定位节点Schema.parse(源)
    this.目标 = 定位节点Schema.parse(目标)
    if (this.数据.源节点 !== this.源.节点标识 || this.数据.目标节点 !== this.目标.节点标识) {
      throw new Error('联想关系的两端节点与引用不一致')
    }
    if (this.源.节点标识 === this.目标.节点标识) throw new Error('联想关系不能自指')
    校验观察结果(原文, { 节点: [this.源, this.目标], 关系: [this.数据], 整体说明: this.数据.连接依据 })
  }

  public 获得源节点(): 定位节点 {
    return structuredClone(this.源)
  }
  public 获得目标节点(): 定位节点 {
    return structuredClone(this.目标)
  }
  public 匹配(条件: 联想关系查询): boolean {
    return (
      (条件.源节点 === undefined || 条件.源节点 === this.源.节点标识) &&
      (条件.目标节点 === undefined || 条件.目标节点 === this.目标.节点标识) &&
      (条件.连接方式 === undefined || 条件.连接方式 === this.数据.连接方式)
    )
  }
  public 导出快照(): 定位关系 {
    return structuredClone(this.数据)
  }
}
