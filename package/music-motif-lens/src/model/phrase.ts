import {
  变奏匹配结果,
  变奏匹配配置,
  提取旋律特征编码,
  旋律特征编码,
  评估变奏关系,
} from '../algorithm/variation-matcher.js'
import { 旋律形态摘要, 轮廓方向 } from '../schema.js'
import { 音符 } from './note.js'

/**
 * 乐句是音轨经过边界切分后得到的独立旋律片段单元。
 * 内部包含有序音符列表、在所属音轨中的序号与全局音符起止下标，并缓存提取后的特征编码。
 * 支持查询相对音程、Parsons 轮廓码、时长比例、旋律形态摘要以及与另一乐句的变奏关系比对。
 */
export class 乐句 {
  private readonly 序号值: number
  private readonly 音轨名称值: string
  private readonly 起始音符下标值: number
  private readonly 结束音符下标值: number
  private readonly 音符列表: readonly 音符[]
  private readonly 特征编码值: 旋律特征编码

  public constructor(参数: { 序号: number; 音轨名称: string; 起始音符下标: number; 音符列表: readonly 音符[] }) {
    if (参数.音符列表.length === 0) {
      throw new Error('乐句至少需要包含 1 个音符')
    }
    this.序号值 = 参数.序号
    this.音轨名称值 = 参数.音轨名称
    this.起始音符下标值 = 参数.起始音符下标
    this.结束音符下标值 = 参数.起始音符下标 + 参数.音符列表.length - 1
    this.音符列表 = [...参数.音符列表]
    this.特征编码值 = 提取旋律特征编码(this.音符列表)
  }

  public 获得序号(): number {
    return this.序号值
  }

  public 获得音轨名称(): string {
    return this.音轨名称值
  }

  public 获得起始音符下标(): number {
    return this.起始音符下标值
  }

  public 获得结束音符下标(): number {
    return this.结束音符下标值
  }

  public 获得起始时间(): number {
    let 首音 = this.音符列表[0]
    if (首音 === undefined) {
      throw new Error('乐句为空')
    }
    return 首音.获得按下时间()
  }

  public 获得结束时间(): number {
    let 尾音 = this.音符列表[this.音符列表.length - 1]
    if (尾音 === undefined) {
      throw new Error('乐句为空')
    }
    return 尾音.获得弹起时间()
  }

  public 获得音符列表(): readonly 音符[] {
    return [...this.音符列表]
  }

  public 获得音名序列(): string[] {
    return this.音符列表.map((音) => 音.获得音高().获得规范音名())
  }

  public 获得相对音程序列(): number[] {
    return [...this.特征编码值.音程序列]
  }

  public 获得轮廓码序列(): 轮廓方向[] {
    return [...this.特征编码值.轮廓序列]
  }

  public 获得时长比例序列(): number[] {
    return [...this.特征编码值.时长比例序列]
  }

  public 获得特征编码(): 旋律特征编码 {
    return {
      起始半音: this.特征编码值.起始半音,
      音程序列: [...this.特征编码值.音程序列],
      轮廓序列: [...this.特征编码值.轮廓序列],
      时长比例序列: [...this.特征编码值.时长比例序列],
      基准时长: this.特征编码值.基准时长,
    }
  }

  /**
   * 统计本乐句的音域跨度、级进/跳进与同音重复比例等几何形态指标。
   */
  public 获得旋律形态摘要(): 旋律形态摘要 {
    let 最低音 = this.音符列表[0]
    let 最高音 = this.音符列表[0]
    if (最低音 === undefined || 最高音 === undefined) {
      throw new Error('乐句为空')
    }

    for (let 音 of this.音符列表) {
      if (音.获得音高().获得半音编号() < 最低音.获得音高().获得半音编号()) {
        最低音 = 音
      }
      if (音.获得音高().获得半音编号() > 最高音.获得音高().获得半音编号()) {
        最高音 = 音
      }
    }

    let 音程总数 = this.特征编码值.音程序列.length
    let 级进数 = 0
    let 跳进数 = 0
    let 同音数 = 0

    for (let 音程 of this.特征编码值.音程序列) {
      let 绝对音程 = Math.abs(音程)
      if (绝对音程 === 0) {
        同音数 += 1
      } else if (绝对音程 <= 2) {
        级进数 += 1
      } else {
        跳进数 += 1
      }
    }

    let 分母 = 音程总数 > 0 ? 音程总数 : 1
    return {
      音符数: this.音符列表.length,
      总时长: Number((this.获得结束时间() - this.获得起始时间()).toFixed(3)),
      音域跨度半音: 最高音.获得音高().获得半音编号() - 最低音.获得音高().获得半音编号(),
      最低音名: 最低音.获得音高().获得规范音名(),
      最高音名: 最高音.获得音高().获得规范音名(),
      级进比例: Number((级进数 / 分母).toFixed(3)),
      跳进比例: Number((跳进数 / 分母).toFixed(3)),
      同音重复比例: Number((同音数 / 分母).toFixed(3)),
    }
  }

  /**
   * 评估当前乐句相对于基准乐句是否构成变奏，返回变奏手法与相似度；不构成时返回 null。
   */
  public 比对变奏(基准乐句: 乐句, 配置?: number | 变奏匹配配置): 变奏匹配结果 | null {
    return 评估变奏关系(基准乐句.特征编码值, this.特征编码值, 配置)
  }
}
