import { 动机 } from '../model/motif.js'
import { 乐句 } from '../model/phrase.js'
import { 变奏关系 } from '../model/variation.js'
import { 片段定位 } from '../schema.js'
import { 变奏匹配配置, 提取旋律特征编码, 旋律特征编码, 评估变奏关系 } from './variation-matcher.js'

/**
 * 动机挖掘参数配置。
 */
export type 动机挖掘配置 = {
  最小动机音符数?: number
  最大动机音符数?: number
  最小出现次数?: number
  最大返回数量?: number
  变奏相似度阈值?: number
}

type 候选窗口 = { 特征: 旋律特征编码; 定位: 片段定位; 信息量分: number }

function 生成轮廓候选键(特征: 旋律特征编码): string {
  let 方向 = 特征.音程序列.map((音程) => Math.sign(音程))
  return [方向, 方向.map((值) => -值), [...方向].reverse(), [...方向].reverse().map((值) => -值)]
    .map((序列) => 序列.join(','))
    .sort()
    .join('|')
}

function 归入匹配组(组列表: 候选窗口[][], 窗口: 候选窗口, 相似度阈值: number): void {
  let 最佳组: 候选窗口[] | undefined
  let 最佳相似度 = 0
  for (let 组 of 组列表) {
    let 原型 = 组[0]
    if (原型 === undefined) {
      throw new Error('动机候选组缺少原型')
    }
    let 匹配 = 评估变奏关系(原型.特征, 窗口.特征, 相似度阈值)
    if (匹配 !== null && 匹配.相似度 > 最佳相似度) {
      最佳组 = 组
      最佳相似度 = 匹配.相似度
    }
  }
  if (最佳组 === undefined) {
    组列表.push([窗口])
  } else {
    最佳组.push(窗口)
  }
}

function 计算音程信息量(音程序列: readonly number[]): number {
  if (音程序列.length === 0) {
    return 0
  }
  let 种类集合 = new Set(音程序列)
  let 非零数 = 音程序列.filter((值) => 值 !== 0).length
  if (非零数 === 0) {
    return 0.1
  }
  return 0.5 + (种类集合.size / 音程序列.length) * 0.5 + Math.min(0.5, 非零数 * 0.15)
}

function 定位是否重叠(甲: 片段定位, 乙: 片段定位): boolean {
  if (甲.音轨名称 !== 乙.音轨名称) {
    return false
  }
  return 甲.起始音符下标 <= 乙.结束音符下标 && 乙.起始音符下标 <= 甲.结束音符下标
}

/**
 * 基于 SIA 平移不变特征与变长 N-gram 显著性过滤从乐句集合中挖掘核心动机。
 */
export function 挖掘核心动机(乐句列表: readonly 乐句[], 配置?: 动机挖掘配置): 动机[] {
  let 最小长度 = 配置?.最小动机音符数 ?? 3
  let 最大长度 = 配置?.最大动机音符数 ?? 7
  let 最小次数 = 配置?.最小出现次数 ?? 2
  let 最大数量 = 配置?.最大返回数量 ?? 5
  let 相似度阈值 = 配置?.变奏相似度阈值 ?? 0.68
  if (Number.isFinite(相似度阈值) === false || 相似度阈值 <= 0 || 相似度阈值 > 1) {
    throw new Error('动机变奏相似度阈值必须在 (0, 1] 范围内')
  }

  let 分组映射 = new Map<string, 候选窗口[][]>()

  for (let 当前乐句 of 乐句列表) {
    let 音符们 = 当前乐句.获得音符列表()
    let 起始全局下标 = 当前乐句.获得起始音符下标()
    let 上限长度 = Math.min(最大长度, 音符们.length)

    for (let 窗口长度 = 最小长度; 窗口长度 <= 上限长度; 窗口长度 += 1) {
      for (let 偏移 = 0; 偏移 <= 音符们.length - 窗口长度; 偏移 += 1) {
        let 切片 = 音符们.slice(偏移, 偏移 + 窗口长度)
        let 首音 = 切片[0]
        let 尾音 = 切片[切片.length - 1]
        if (首音 === undefined || 尾音 === undefined) {
          continue
        }

        let 特征 = 提取旋律特征编码(切片)
        let 候选键 = 生成轮廓候选键(特征)
        let 信息量分 = 计算音程信息量(特征.音程序列)

        let 窗口: 候选窗口 = {
          特征,
          定位: {
            音轨名称: 当前乐句.获得音轨名称(),
            乐句序号: 当前乐句.获得序号(),
            起始音符下标: 起始全局下标 + 偏移,
            结束音符下标: 起始全局下标 + 偏移 + 窗口长度 - 1,
            起始时间: 首音.获得按下时间(),
            结束时间: 尾音.获得弹起时间(),
          },
          信息量分,
        }

        let 已有 = 分组映射.get(候选键)
        if (已有 === undefined) {
          分组映射.set(候选键, [[窗口]])
        } else {
          归入匹配组(已有, 窗口, 相似度阈值)
        }
      }
    }
  }

  let 评分候选: Array<{ 原型: 候选窗口; 非重叠位置: 片段定位[]; 显著度: number }> = []

  for (let 组内窗口 of [...分组映射.values()].flat()) {
    let 非重叠组: 候选窗口[] = []
    for (let 候选 of 组内窗口) {
      let 冲突 = 非重叠组.some((已选) => 定位是否重叠(已选.定位, 候选.定位))
      if (冲突 === false) {
        非重叠组.push(候选)
      }
    }

    if (非重叠组.length < 最小次数) {
      continue
    }

    let 原型 = 非重叠组[0]
    if (原型 === undefined) {
      continue
    }

    let 音符数 = 原型.定位.结束音符下标 - 原型.定位.起始音符下标 + 1
    let 显著度 = Number((非重叠组.length * 音符数 * 原型.信息量分).toFixed(3))
    评分候选.push({ 原型, 非重叠位置: 非重叠组.map((项) => 项.定位), 显著度 })
  }

  评分候选.sort((甲, 乙) => 乙.显著度 - 甲.显著度)

  let 已选动机: 动机[] = []
  let 已占用原型定位: 片段定位[] = []

  for (let 候选 of 评分候选) {
    if (已选动机.length >= 最大数量) {
      break
    }
    let 与高分动机重叠 = 已占用原型定位.some((已占) => 定位是否重叠(已占, 候选.原型.定位))
    if (与高分动机重叠) {
      continue
    }

    已占用原型定位.push(...候选.非重叠位置)
    已选动机.push(
      new 动机({
        标识: `M${String(已选动机.length + 1)}`,
        原型特征: 候选.原型.特征,
        出现位置列表: 候选.非重叠位置,
        显著度: 候选.显著度,
      }),
    )
  }

  return 已选动机
}

function 构造乐句定位(目标乐句: 乐句): 片段定位 {
  return {
    音轨名称: 目标乐句.获得音轨名称(),
    乐句序号: 目标乐句.获得序号(),
    起始音符下标: 目标乐句.获得起始音符下标(),
    结束音符下标: 目标乐句.获得结束音符下标(),
    起始时间: 目标乐句.获得起始时间(),
    结束时间: 目标乐句.获得结束时间(),
  }
}

/**
 * 曲式自相似结构聚类超参数配置。
 */
export type 曲式聚类配置 = {
  同段相似度阈值?: number | undefined
  变体相似度阈值?: number | undefined
  变体标记后缀?: string | undefined
}

/**
 * 在一组有序乐句内部识别先发原型与后续变奏演化关系。
 */
export function 识别轨内变奏关系(乐句列表: readonly 乐句[], 变奏配置?: number | 变奏匹配配置): 变奏关系[] {
  let 关系列表: 变奏关系[] = []

  for (let 后索引 = 1; 后索引 < 乐句列表.length; 后索引 += 1) {
    let 目标乐句 = 乐句列表[后索引]
    if (目标乐句 === undefined) {
      continue
    }

    let 最佳源: 乐句 | undefined
    let 最佳匹配: ReturnType<typeof 评估变奏关系> = null

    for (let 前索引 = 0; 前索引 < 后索引; 前索引 += 1) {
      let 基准乐句 = 乐句列表[前索引]
      if (基准乐句 === undefined) {
        continue
      }
      let 匹配 = 目标乐句.比对变奏(基准乐句, 变奏配置)
      if (匹配 === null) {
        continue
      }
      if (最佳匹配 === null || 匹配.相似度 > 最佳匹配.相似度) {
        最佳匹配 = 匹配
        最佳源 = 基准乐句
      }
    }

    if (最佳源 !== undefined && 最佳匹配 !== null) {
      关系列表.push(
        new 变奏关系({
          源定位: 构造乐句定位(最佳源),
          目标定位: 构造乐句定位(目标乐句),
          手法: 最佳匹配.手法,
          移调半音数: 最佳匹配.移调半音数,
          相似度: 最佳匹配.相似度,
          说明: 最佳匹配.说明,
        }),
      )
    }
  }

  return 关系列表
}

/**
 * 跨音轨扫描不同声部之间的动机模仿与变奏呼应关系（每个目标乐句收敛保留最佳模仿源）。
 */
export function 识别跨轨变奏关系(全部乐句: readonly 乐句[], 变奏配置?: number | 变奏匹配配置): 变奏关系[] {
  let 目标最佳源映射 = new Map<string, { 源: 乐句; 目标: 乐句; 匹配: NonNullable<ReturnType<typeof 评估变奏关系>> }>()

  for (let 索引甲 = 0; 索引甲 < 全部乐句.length; 索引甲 += 1) {
    let 乐句甲 = 全部乐句[索引甲]
    if (乐句甲 === undefined) {
      continue
    }

    for (let 索引乙 = 索引甲 + 1; 索引乙 < 全部乐句.length; 索引乙 += 1) {
      let 乐句乙 = 乐句列表安全取(全部乐句, 索引乙)
      if (乐句乙 === undefined || 乐句甲.获得音轨名称() === 乐句乙.获得音轨名称()) {
        continue
      }

      let 先发 = 乐句甲.获得起始时间() <= 乐句乙.获得起始时间() ? 乐句甲 : 乐句乙
      let 后发 = 先发 === 乐句甲 ? 乐句乙 : 乐句甲
      let 匹配 = 后发.比对变奏(先发, 变奏配置)
      if (匹配 === null) {
        continue
      }

      let 目标键 = `${后发.获得音轨名称()}#${String(后发.获得序号())}`
      let 已有 = 目标最佳源映射.get(目标键)
      if (
        已有 === undefined ||
        匹配.相似度 > 已有.匹配.相似度 ||
        (匹配.相似度 === 已有.匹配.相似度 && 先发.获得起始时间() < 已有.源.获得起始时间())
      ) {
        目标最佳源映射.set(目标键, { 源: 先发, 目标: 后发, 匹配 })
      }
    }
  }

  let 关系列表: 变奏关系[] = []
  for (let 记录 of 目标最佳源映射.values()) {
    关系列表.push(
      new 变奏关系({
        源定位: 构造乐句定位(记录.源),
        目标定位: 构造乐句定位(记录.目标),
        手法: 记录.匹配.手法,
        移调半音数: 记录.匹配.移调半音数,
        相似度: 记录.匹配.相似度,
        说明: 记录.匹配.说明,
      }),
    )
  }

  return 关系列表
}

function 乐句列表安全取(列表: readonly 乐句[], 下标: number): 乐句 | undefined {
  return 列表[下标]
}

/**
 * 基于 Foote (1999) 自相似矩阵思想为一组有序乐句生成段落结构标签（支持同段共享字母与变体带撇号，如 A-B-B'-B'-A-B）。
 */
export function 生成自相似曲式标签(乐句列表: readonly 乐句[], 配置?: number | 曲式聚类配置): string[] {
  let 同段阈值 = typeof 配置 === 'number' ? 配置 : (配置?.同段相似度阈值 ?? 0.96)
  let 变体阈值 = typeof 配置 === 'number' ? 配置 : (配置?.变体相似度阈值 ?? 0.82)
  let 变体后缀 = typeof 配置 === 'number' ? "'" : (配置?.变体标记后缀 ?? "'")

  let 标签列表: string[] = []
  let 代表乐句列表: Array<{ 标签: string; 代表: 乐句 }> = []
  let 字母表 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  for (let 当前乐句 of 乐句列表) {
    let 最佳原型: { 标签: string; 相似度: number; 是否原样: boolean } | undefined

    for (let 已有 of 代表乐句列表) {
      let 匹配 = 当前乐句.比对变奏(已有.代表, 变体阈值)
      if (匹配 === null) {
        continue
      }
      let 是否原样 = 匹配.手法 === '原样重复' && 匹配.相似度 >= 同段阈值
      if (
        最佳原型 === undefined ||
        (是否原样 && 最佳原型.是否原样 === false) ||
        (是否原样 === 最佳原型.是否原样 && 匹配.相似度 > 最佳原型.相似度)
      ) {
        最佳原型 = { 标签: 已有.标签, 相似度: 匹配.相似度, 是否原样 }
      }
    }

    if (最佳原型 !== undefined) {
      标签列表.push(最佳原型.是否原样 ? 最佳原型.标签 : `${最佳原型.标签}${变体后缀}`)
    } else {
      let 新索引 = 代表乐句列表.length
      let 新标签 = 字母表[新索引] ?? `S${String(新索引 + 1)}`
      代表乐句列表.push({ 标签: 新标签, 代表: 当前乐句 })
      标签列表.push(新标签)
    }
  }

  return 标签列表
}
