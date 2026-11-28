export type 参照桶 = { 档位: number; 样本数: number; 覆盖比中位数: number }

export function 期望覆盖(篇数: number, 总次数: number): number {
  return -篇数 * Math.expm1(-总次数 / 篇数)
}

function 随机源(种子: number): () => number {
  let 状态 = 种子
  return (): number => {
    状态 = (Math.imul(状态, 1664525) + 1013904223) >>> 0
    return 状态 / 0x100000000
  }
}

function 抽取字串(文档: readonly string[], 种子: number, 上限: number): Set<string> {
  let 字符 = Array.from(文档.join('\n'))
  let 随机 = 随机源(种子)
  let 样本 = new Set<string>()
  for (let i = 0; i < 4 * 上限 && 样本.size < 上限; i++) {
    let 起点 = Math.floor(随机() * 字符.length)
    let 长度 = 2 + Math.floor(随机() * 3)
    if (起点 + 长度 > 字符.length) continue
    let 片段 = 字符.slice(起点, 起点 + 长度).join('')
    if (片段.trim() === 片段 && /[\r\n]/u.test(片段) === false) 样本.add(片段)
  }
  return 样本
}

export function 建立参照(文档: readonly string[], 种子: number, 上限: number): 参照桶[] {
  let 样本 = 抽取字串(文档, 种子, 上限)
  let 计数 = new Map<string, { 总次数: number; 覆盖篇数: number; 末次篇号: number }>()
  for (let [篇号, 文本] of 文档.entries()) {
    let 字符 = Array.from(文本)
    for (let 起点 = 0; 起点 < 字符.length; 起点++) {
      for (let 长度 = 2; 长度 <= 4 && 起点 + 长度 <= 字符.length; 长度++) {
        let 串 = 字符.slice(起点, 起点 + 长度).join('')
        if (样本.has(串) === false) continue
        let 项 = 计数.get(串)
        if (项 === undefined) {
          计数.set(串, { 总次数: 1, 覆盖篇数: 1, 末次篇号: 篇号 })
        } else {
          项.总次数++
          if (项.末次篇号 !== 篇号) {
            项.覆盖篇数++
            项.末次篇号 = 篇号
          }
        }
      }
    }
  }
  let 各档 = new Map<number, number[]>()
  for (let { 总次数, 覆盖篇数 } of 计数.values()) {
    if (总次数 < 3) continue
    let 档位 = Math.floor(Math.log2(总次数))
    let 覆盖比 = 覆盖篇数 / 期望覆盖(文档.length, 总次数)
    let 桶 = 各档.get(档位)
    if (桶 === undefined) 各档.set(档位, [覆盖比])
    else 桶.push(覆盖比)
  }
  let 参照: 参照桶[] = []
  for (let [档位, 比值] of 各档) {
    if (比值.length < 5) continue
    比值.sort((甲, 乙) => 甲 - 乙)
    let 中位数 = 比值[Math.floor(比值.length / 2)]
    if (中位数 === undefined) throw new Error('参照桶缺少中位数')
    参照.push({ 档位, 样本数: 比值.length, 覆盖比中位数: 中位数 })
  }
  return 参照.sort((甲, 乙) => 甲.档位 - 乙.档位)
}
