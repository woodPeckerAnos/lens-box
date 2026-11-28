import { 变奏匹配结果, 变奏匹配配置, 旋律特征编码, 评估变奏关系 } from '../algorithm/variation-matcher.js'
import { 片段定位, 轮廓方向 } from '../schema.js'
import { 乐句 } from './phrase.js'

/**
 * 动机是从旋律中挖掘出的具有辨识度且反复发展的基本“音乐基因”。
 * 内部保存原型的音程序列、轮廓码、时长比例序列、显著度评分以及在作品中出现的所有定位列表。
 * 支持判定任意乐句或片段是否属于该动机的变奏，以及统计出现频次与涉及音轨。
 */
export class 动机 {
  private readonly 标识值: string
  private readonly 原型特征值: 旋律特征编码
  private readonly 出现位置列表: readonly 片段定位[]
  private readonly 显著度值: number

  public constructor(参数: {
    标识: string
    原型特征: 旋律特征编码
    出现位置列表: readonly 片段定位[]
    显著度: number
  }) {
    if (参数.出现位置列表.length === 0) {
      throw new Error('动机至少需要包含 1 个出现位置')
    }
    this.标识值 = 参数.标识
    this.原型特征值 = {
      起始半音: 参数.原型特征.起始半音,
      音程序列: [...参数.原型特征.音程序列],
      轮廓序列: [...参数.原型特征.轮廓序列],
      时长比例序列: [...参数.原型特征.时长比例序列],
      基准时长: 参数.原型特征.基准时长,
    }
    this.出现位置列表 = 参数.出现位置列表.map((位置) => ({ ...位置 }))
    this.显著度值 = 参数.显著度
  }

  public 获得标识(): string {
    return this.标识值
  }

  public 获得音程序列(): number[] {
    return [...this.原型特征值.音程序列]
  }

  public 获得轮廓码序列(): 轮廓方向[] {
    return [...this.原型特征值.轮廓序列]
  }

  public 获得时长比例序列(): number[] {
    return [...this.原型特征值.时长比例序列]
  }

  public 获得出现次数(): number {
    return this.出现位置列表.length
  }

  public 获得出现位置列表(): 片段定位[] {
    return this.出现位置列表.map((位置) => ({ ...位置 }))
  }

  public 获得涉及音轨名称(): string[] {
    let 集合 = new Set<string>()
    for (let 位置 of this.出现位置列表) {
      集合.add(位置.音轨名称)
    }
    return [...集合]
  }

  public 获得显著度(): number {
    return this.显著度值
  }

  /**
   * 判断指定乐句是否包含或演化自当前动机。
   */
  public 匹配乐句变奏(目标乐句: 乐句, 配置?: number | 变奏匹配配置): 变奏匹配结果 | null {
    return 评估变奏关系(this.原型特征值, 目标乐句.获得特征编码(), 配置)
  }

  /**
   * 比较两个动机在核心音程与轮廓骨架上的相似度。
   */
  public 与另一动机比对(其他动机: 动机, 配置?: number | 变奏匹配配置): 变奏匹配结果 | null {
    return 评估变奏关系(this.原型特征值, 其他动机.原型特征值, 配置)
  }
}
