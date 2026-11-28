import { Jieba } from '@node-rs/jieba'
import { dict } from '@node-rs/jieba/dict.js'
import { 形式句子, 形式词项 } from '../schema.js'
import { 创建原文片段 } from './text-segmentation.js'

let 分词器 = Jieba.withDict(dict)

/** 按 jieba 的 d、p、c、u 系列以及 e、y、o 标记识别的操作性虚词范围。 */
export function 是否虚词词性(词性: string): boolean {
  return /^(?:d|p|c|u[a-z]*|e|y|o)$/u.test(词性)
}

export function 提取形式词项(原文: string, 句子们: readonly 形式句子[]): 形式词项[] {
  let 结果: 形式词项[] = []
  for (let 句子 of 句子们) {
    let 游标 = 0
    for (let 标注 of 分词器.tag(句子.原文, true)) {
      if (标注.word.length === 0) throw new Error('jieba 返回了空词项')
      let 词起点 = 句子.原文.indexOf(标注.word, 游标)
      if (词起点 < 0 || /\S/u.test(句子.原文.slice(游标, 词起点)) === true) {
        throw new Error('jieba 词项无法按顺序对齐原文')
      }
      游标 = 词起点 + 标注.word.length
      // 保留所有含文字或数字的词项；标点另行统计，符号仅保留在字符数中。
      if (/[\p{L}\p{N}]/u.test(标注.word) === false) continue
      结果.push({
        ...创建原文片段(原文, 句子.起始偏移 + 词起点, 句子.起始偏移 + 游标),
        词性: 标注.tag,
        段落序号: 句子.段落序号,
        句子序号: 句子.序号,
      })
    }
    if (/\S/u.test(句子.原文.slice(游标)) === true) throw new Error('jieba 未覆盖句末的非空白文本')
  }
  return 结果
}
