import { 是否虚词词性 } from '../analysis/lexical.js'
import { 创建原文片段, 计算非空白字符数 } from '../analysis/text-segmentation.js'
import {
  原文片段,
  定位例证,
  已解析语言形式配置,
  形式句子,
  形式段落,
  形式词项,
  语言形式统计,
  长度节奏项,
} from '../schema.js'
import { 形式出现, 编制频率表 } from './frequency-table.js'

function 创建例证(片段: 原文片段, 段落序号: number, 句子序号: number | null): 定位例证 {
  return { 起始偏移: 片段.起始偏移, 结束偏移: 片段.结束偏移, 原文: 片段.原文, 篇章序号: 0, 段落序号, 句子序号 }
}

export function 创建句长节奏(句子们: readonly 形式句子[]): 长度节奏项[] {
  return 句子们.map((句子) => ({ 长度: 计算非空白字符数(句子.原文), 例证: 创建例证(句子, 句子.段落序号, 句子.序号) }))
}

export function 创建段长节奏(段落们: readonly 形式段落[]): 长度节奏项[] {
  return 段落们.map((段落) => ({
    长度: 计算非空白字符数(段落.原文),
    例证: 创建例证({ 起始偏移: 段落.起始偏移, 结束偏移: 段落.结束偏移, 原文: 段落.原文 }, 段落.序号, null),
  }))
}

function 提取窗口(原文: string, 词项们: readonly 形式词项[], 长度: number, 仅词性: boolean): 形式出现[] {
  let 结果: 形式出现[] = []
  let 连续词们: 形式词项[] = []
  for (let 词 of 词项们) {
    let 前词 = 连续词们.at(-1)
    if (前词 !== undefined) {
      let 间隔 = 原文.slice(前词.结束偏移, 词.起始偏移)
      if (前词.句子序号 !== 词.句子序号 || /^\s*$/u.test(间隔) === false) 连续词们 = []
    }
    连续词们.push(词)
    if (连续词们.length > 长度) 连续词们.shift()
    if (连续词们.length < 长度) continue
    let 首词 = 连续词们[0]
    if (首词 === undefined) throw new Error('组合窗口缺少首词')
    结果.push({
      项: 连续词们.map((项) => (仅词性 === true ? 项.词性 : 项.原文)),
      例证: 创建例证(创建原文片段(原文, 首词.起始偏移, 词.结束偏移), 词.段落序号, 词.句子序号),
    })
  }
  return 结果
}

function 提取标点(原文: string, 句子们: readonly 形式句子[]): 形式出现[] {
  let 结果: 形式出现[] = []
  for (let 句子 of 句子们) {
    let 偏移 = 句子.起始偏移
    for (let 字符 of 句子.原文) {
      if (/\p{P}/u.test(字符) === true) {
        结果.push({
          项: [字符],
          例证: 创建例证(创建原文片段(原文, 偏移, 偏移 + 字符.length), 句子.段落序号, 句子.序号),
        })
      }
      偏移 += 字符.length
    }
  }
  return 结果
}

export function 编制篇章统计(
  原文: string,
  句子们: readonly 形式句子[],
  词项们: readonly 形式词项[],
  句长节奏: readonly 长度节奏项[],
  段长节奏: readonly 长度节奏项[],
  配置: 已解析语言形式配置,
): 语言形式统计 {
  let 上限 = 配置.每项例证上限
  let 词出现们 = 词项们.map((词) => ({
    项: [词.原文],
    例证: 创建例证({ 起始偏移: 词.起始偏移, 结束偏移: 词.结束偏移, 原文: 词.原文 }, 词.段落序号, 词.句子序号),
  }))
  let 词性出现们 = 词项们.map((词, 索引) => {
    let 出现 = 词出现们[索引]
    if (出现 === undefined) throw new Error('词性分布缺少词项例证')
    return { 项: [词.词性], 例证: 出现.例证 }
  })
  let 虚词出现们 = 词出现们.filter((出现, 索引) => {
    let 词 = 词项们[索引]
    if (词 === undefined) throw new Error('虚词统计缺少词项')
    return 是否虚词词性(词.词性)
  })
  let 搭配 = 提取窗口(原文, 词项们, 2, false)
  let 词性序列 = 提取窗口(原文, 词项们, 配置.词性序列长度, true)
  let 标点 = 提取标点(原文, 句子们)
  return {
    非空白字符数: 计算非空白字符数(原文),
    词频: 编制频率表(词出现们, 词项们.length, 上限),
    词性分布: 编制频率表(词性出现们, 词项们.length, 上限),
    虚词词项: 编制频率表(虚词出现们, 词项们.length, 上限),
    相邻词搭配: 编制频率表(搭配, 搭配.length, 上限),
    词性短序列: 编制频率表(词性序列, 词性序列.length, 上限),
    标点分布: 编制频率表(标点, 标点.length, 上限),
    句长分布: 编制频率表(
      句长节奏.map((项) => ({ 项: [String(项.长度)], 例证: 项.例证 })),
      句长节奏.length,
      上限,
    ),
    段长分布: 编制频率表(
      段长节奏.map((项) => ({ 项: [String(项.长度)], 例证: 项.例证 })),
      段长节奏.length,
      上限,
    ),
  }
}
