import { 音符 } from '../model/note.js'
import { 轮廓方向 } from '../schema.js'

/**
 * 旋律片段的音程、归一化节奏与绝对时值尺度。
 */
export type 旋律特征编码 = {
  起始半音: number
  音程序列: number[]
  轮廓序列: 轮廓方向[]
  时长比例序列: number[]
  基准时长: number
}

/**
 * 从音符序列提取相对音程、Parsons 轮廓码以及保留基准时长的归一化节奏。
 */
export function 提取旋律特征编码(音符列表: readonly 音符[]): 旋律特征编码 {
  let 首音 = 音符列表[0]
  if (首音 === undefined) {
    return { 起始半音: 0, 音程序列: [], 轮廓序列: [], 时长比例序列: [], 基准时长: 1 }
  }

  let 音程序列: number[] = []
  let 轮廓序列: 轮廓方向[] = []
  let 时长列表: number[] = []

  for (let 索引 = 0; 索引 < 音符列表.length; 索引 += 1) {
    let 当前 = 音符列表[索引]
    if (当前 === undefined) {
      continue
    }
    let 下一个 = 音符列表[索引 + 1]
    if (下一个 !== undefined) {
      let 音程 = 当前.获得音高().到目标音程(下一个.获得音高())
      音程序列.push(音程)
      轮廓序列.push(音程 > 0 ? 'U' : 音程 < 0 ? 'D' : 'R')
      let 间隔 = 当前.到下一音起始间隔(下一个)
      时长列表.push(间隔 > 1e-6 ? 间隔 : 当前.获得持续时长())
    } else {
      时长列表.push(当前.获得持续时长())
    }
  }

  let 基准时长 = 1
  let 正时长 = 时长列表.filter((值) => 值 > 1e-6)
  if (正时长.length > 0) {
    let 排序 = [...正时长].sort((甲, 乙) => 甲 - 乙)
    基准时长 = 排序[0] ?? 1
  }
  let 时长比例序列 = 时长列表.map((值) => 值 / 基准时长)

  return { 起始半音: 首音.获得音高().获得半音编号(), 音程序列, 轮廓序列, 时长比例序列, 基准时长 }
}

export function 序列完全相等(甲: readonly number[], 乙: readonly number[], 容差 = 0, 使用相对容差 = false): boolean {
  if (甲.length !== 乙.length) {
    return false
  }
  for (let 索引 = 0; 索引 < 甲.length; 索引 += 1) {
    let 左值 = 甲[索引]
    let 右值 = 乙[索引]
    if (
      左值 === undefined ||
      右值 === undefined ||
      Math.abs(左值 - 右值) > 容差 * (使用相对容差 ? Math.max(Math.abs(左值), Math.abs(右值)) : 1)
    ) {
      return false
    }
  }
  return true
}

export function 轮廓完全相等(甲: readonly 轮廓方向[], 乙: readonly 轮廓方向[]): boolean {
  if (甲.length !== 乙.length) {
    return false
  }
  for (let 索引 = 0; 索引 < 甲.length; 索引 += 1) {
    if (甲[索引] !== 乙[索引]) {
      return false
    }
  }
  return true
}

export function 计算节奏比例相似度(甲: readonly number[], 乙: readonly number[]): number {
  if (甲.length === 0 && 乙.length === 0) {
    return 1
  }
  if (甲.length !== 乙.length) {
    let 较短 = Math.min(甲.length, 乙.length)
    let 较长 = Math.max(甲.length, 乙.length)
    return 较长 === 0 ? 1 : (较短 / 较长) * 0.7
  }
  let 累计分 = 0
  for (let 索引 = 0; 索引 < 甲.length; 索引 += 1) {
    let 左值 = 甲[索引] ?? 1
    let 右值 = 乙[索引] ?? 1
    let 最大值 = Math.max(左值, 右值, 1e-6)
    累计分 += 1 - Math.abs(左值 - 右值) / 最大值
  }
  return 累计分 / 甲.length
}
