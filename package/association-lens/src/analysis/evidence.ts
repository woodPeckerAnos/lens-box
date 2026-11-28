import { z } from 'zod'
import {
  原文引用,
  原文引用Schema,
  定位观察结果,
  定位观察结果Schema,
  定位证据,
  联想观察结果,
  联想观察结果Schema,
} from '../schema.js'

export function 定位原文引用(原文: string, 引用: 原文引用): 定位证据 {
  引用 = 原文引用Schema.parse(引用)
  let 从此开始 = 0
  let 起点 = -1
  for (let 序号 = 0; 序号 <= 引用.出现序号; 序号 += 1) {
    起点 = 原文.indexOf(引用.引文, 从此开始)
    if (起点 === -1) {
      if (序号 === 0) throw 创建校验错误(`引文不存在于原文中：${JSON.stringify(引用)}`)
      throw 创建校验错误(
        `出现序号越界：该引文在原文中仅出现 ${序号} 次（有效出现序号为 0..${序号 - 1}，未重复出现的引文应填 0）：${JSON.stringify(引用)}`,
      )
    }
    从此开始 = 起点 + 1
  }
  return { ...引用, 起点, 终点: 起点 + 引用.引文.length }
}

export function 转换定位结果(原文: string, 原始结果: 联想观察结果): 定位观察结果 {
  let 结果 = 联想观察结果Schema.parse(原始结果)
  let 定位 = (证据: 原文引用[]): 定位证据[] => 证据.map((引用) => 定位原文引用(原文, 引用))
  let 定位后: 定位观察结果 = {
    节点: 结果.节点.map((节点) => ({ ...节点, 证据: 定位(节点.证据) })),
    关系: 结果.关系.map((关系) => ({
      ...关系,
      连接依据: { ...关系.连接依据, 证据: 定位(关系.连接依据.证据) },
      表达作用: { ...关系.表达作用, 证据: 定位(关系.表达作用.证据) },
      后文发展: { ...关系.后文发展, 证据: 定位(关系.后文发展.证据) },
    })),
    整体说明: { ...结果.整体说明, 证据: 定位(结果.整体说明.证据) },
  }
  校验观察结果(原文, 定位后)
  return 定位后
}

export function 校验观察结果(原文: string, 原始结果: 定位观察结果): void {
  let 结果 = 定位观察结果Schema.parse(原始结果)
  let 节点标识 = new Set<string>()
  let 关系标识 = new Set<string>()
  let 关系键 = new Set<string>()
  let 使用节点 = new Set<string>()
  let 全部证据 = [...结果.整体说明.证据]
  for (let 节点 of 结果.节点) {
    if (节点标识.has(节点.节点标识)) throw 创建校验错误(`重复节点标识：${节点.节点标识}`)
    节点标识.add(节点.节点标识)
    全部证据.push(...节点.证据)
  }
  for (let 关系 of 结果.关系) {
    if (关系标识.has(关系.关系标识)) throw 创建校验错误(`重复关系标识：${关系.关系标识}`)
    关系标识.add(关系.关系标识)
    if (节点标识.has(关系.源节点) === false || 节点标识.has(关系.目标节点) === false) {
      throw 创建校验错误(`关系引用了不存在的节点：${关系.关系标识}`)
    }
    if (关系.源节点 === 关系.目标节点) throw 创建校验错误(`关系不能自指：${关系.关系标识}`)
    let 键 = JSON.stringify([关系.源节点, 关系.目标节点, 关系.连接方式])
    if (关系键.has(键)) throw 创建校验错误(`同一源目标与连接方式的关系重复：${关系.关系标识}`)
    关系键.add(键)
    使用节点.add(关系.源节点)
    使用节点.add(关系.目标节点)
    全部证据.push(...关系.连接依据.证据, ...关系.表达作用.证据, ...关系.后文发展.证据)
    if (关系.后文发展.状态 === '延续') {
      let 首次依据终点 = Math.min(...关系.连接依据.证据.map((证据) => 证据.终点))
      if (关系.后文发展.证据.some((证据) => 证据.起点 >= 首次依据终点) === false) {
        throw 创建校验错误(`标为延续时至少需要一处连接依据之后的证据：${关系.关系标识}`)
      }
    }
  }
  let 孤立节点们 = [...节点标识].filter((标识) => 使用节点.has(标识) === false)
  if (孤立节点们.length > 0) {
    throw 创建校验错误(`节点未参与任何联想关系：${孤立节点们.join('、')}（请为这些节点补充关系或从节点列表中删除）`)
  }
  for (let 证据 of 全部证据) {
    let 期望 = 定位原文引用(原文, { 引文: 证据.引文, 出现序号: 证据.出现序号 })
    if (证据.起点 !== 期望.起点 || 证据.终点 !== 期望.终点) {
      throw 创建校验错误(`证据位置与原文逐字引用不一致：${JSON.stringify(证据)}`)
    }
  }
}

export function 创建结果校验Schema(原文: string): z.ZodEffects<typeof 联想观察结果Schema> {
  return 联想观察结果Schema.superRefine((结果, 上下文) => {
    try {
      转换定位结果(原文, 结果)
    } catch (错误) {
      if (错误 instanceof z.ZodError) {
        上下文.addIssue({ code: z.ZodIssueCode.custom, message: 错误.message })
        return
      }
      throw 错误
    }
  })
}

function 创建校验错误(消息: string): z.ZodError {
  return new z.ZodError([{ code: z.ZodIssueCode.custom, path: [], message: 消息 }])
}
