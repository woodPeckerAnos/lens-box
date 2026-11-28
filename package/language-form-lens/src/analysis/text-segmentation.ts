import { 原文片段, 形式句子, 形式段落 } from '../schema.js'

let 闭合符号 = new Set(['”', '’', '」', '』', '》', '〉', '）', ')', '】', ']', '"', "'"])
let 终止标点 = new Set(['。', '！', '？', '!', '?', '；', ';', '…'])

export function 计算非空白字符数(文本: string): number {
  let 数量 = 0
  for (let 字符 of 文本) {
    if (/\s/u.test(字符) === false) 数量++
  }
  return 数量
}

export function 创建原文片段(原文: string, 起始偏移: number, 结束偏移: number): 原文片段 {
  return { 起始偏移, 结束偏移, 原文: 原文.slice(起始偏移, 结束偏移) }
}

function 是否句末(文本: string, 位置: number): boolean {
  let 字符 = 文本[位置]
  if (字符 === undefined) throw new Error('句子扫描位置越界')
  if (终止标点.has(字符) === true) return true
  if (字符 !== '.') return false
  // 半角点仅在篇末、空白或闭合符号前作为句末，避免拆开小数、版本号与域名。
  let 后字符 = 文本[位置 + 1]
  return 后字符 === undefined || /\s/u.test(后字符) === true || 闭合符号.has(后字符) === true
}

export function 切分段落(原文: string): 形式段落[] {
  let 结果: 形式段落[] = []
  for (let 匹配 of 原文.matchAll(/[^\r\n\u2028\u2029]+/gu)) {
    let 文本 = 匹配[0]
    if (/\S/u.test(文本) === false) continue
    结果.push({ ...创建原文片段(原文, 匹配.index, 匹配.index + 文本.length), 序号: 结果.length })
  }
  return 结果
}

export function 切分句子(原文: string, 段落们: readonly 形式段落[]): 形式句子[] {
  let 结果: 形式句子[] = []
  for (let 段落 of 段落们) {
    let 起点 = 0
    for (let 位置 = 0; 位置 < 段落.原文.length; 位置++) {
      if (是否句末(段落.原文, 位置) === false) continue
      let 终点 = 位置 + 1
      while (终点 < 段落.原文.length) {
        let 字符 = 段落.原文[终点]
        if (字符 === undefined) throw new Error('句末扫描位置越界')
        if (是否句末(段落.原文, 终点) === false && 闭合符号.has(字符) === false) break
        终点++
      }
      let 片段 = 创建原文片段(原文, 段落.起始偏移 + 起点, 段落.起始偏移 + 终点)
      if (/\S/u.test(片段.原文) === true) {
        结果.push({ ...片段, 序号: 结果.length, 段落序号: 段落.序号 })
      }
      起点 = 终点
      位置 = 终点 - 1
    }
    let 尾段 = 创建原文片段(原文, 段落.起始偏移 + 起点, 段落.结束偏移)
    if (/\S/u.test(尾段.原文) === true) {
      结果.push({ ...尾段, 序号: 结果.length, 段落序号: 段落.序号 })
    }
  }
  return 结果
}
