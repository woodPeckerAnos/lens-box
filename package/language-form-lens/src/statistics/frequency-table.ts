import { 定位例证, 形式分布差异, 形式频率表, 形式频率项 } from '../schema.js'

export type 形式出现 = { 项: string[]; 例证: 定位例证 }

export function 合并频率表(表们: readonly 形式频率表[], 例证上限: number): 形式频率表 {
  let 分母 = 表们.reduce((和, 表) => 和 + 表.分母, 0)
  let 映射 = new Map<string, 形式频率项>()
  for (let 表 of 表们) {
    for (let 项 of 表.项目) {
      let 键 = JSON.stringify(项.项)
      let 已有 = 映射.get(键)
      if (已有 === undefined) {
        映射.set(键, { 项: [...项.项], 次数: 项.次数, 频率: 0, 例证: 项.例证.slice(0, 例证上限) })
        continue
      }
      已有.次数 += 项.次数
      已有.例证.push(...项.例证.slice(0, Math.max(0, 例证上限 - 已有.例证.length)))
    }
  }
  let 项目 = [...映射.values()]
  for (let 项 of 项目) 项.频率 = 分母 === 0 ? 0 : 项.次数 / 分母
  项目.sort((甲, 乙) => {
    let 次数差 = 乙.次数 - 甲.次数
    if (次数差 !== 0) return 次数差
    let 甲键 = JSON.stringify(甲.项)
    let 乙键 = JSON.stringify(乙.项)
    if (甲键 < 乙键) return -1
    if (甲键 > 乙键) return 1
    return 0
  })
  return { 分母, 项目 }
}

export function 编制频率表(出现们: readonly 形式出现[], 分母: number, 例证上限: number): 形式频率表 {
  let 映射 = new Map<string, 形式频率项>()
  for (let 出现 of 出现们) {
    let 键 = JSON.stringify(出现.项)
    let 已有 = 映射.get(键)
    if (已有 === undefined) {
      映射.set(键, { 项: [...出现.项], 次数: 1, 频率: 0, 例证: [出现.例证] })
      continue
    }
    已有.次数++
    if (已有.例证.length < 例证上限) 已有.例证.push(出现.例证)
  }
  return 合并频率表([{ 分母, 项目: [...映射.values()] }], 例证上限)
}

export function 对比频率表(甲: 形式频率表, 乙: 形式频率表): 形式分布差异 {
  let 甲映射 = new Map(甲.项目.map((项) => [JSON.stringify(项.项), 项]))
  let 乙映射 = new Map(乙.项目.map((项) => [JSON.stringify(项.项), 项]))
  let 键们 = new Set([...甲映射.keys(), ...乙映射.keys()])
  let 项目 = [...键们].map((键) => {
    let 甲项 = 甲映射.get(键)
    let 乙项 = 乙映射.get(键)
    let 项 = 甲项?.项 ?? 乙项?.项
    if (项 === undefined) throw new Error('频率对比缺少项目')
    let 甲频率 = 甲项?.频率 ?? 0
    let 乙频率 = 乙项?.频率 ?? 0
    return { 项: [...项], 甲次数: 甲项?.次数 ?? 0, 乙次数: 乙项?.次数 ?? 0, 甲频率, 乙频率, 乙减甲: 乙频率 - 甲频率 }
  })
  项目.sort((左, 右) => Math.abs(右.乙减甲) - Math.abs(左.乙减甲))
  return { 甲分母: 甲.分母, 乙分母: 乙.分母, 项目 }
}
