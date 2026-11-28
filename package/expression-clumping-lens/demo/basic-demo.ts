import { 成团语料 } from '../src/index.js'
import { 八晚闲聊, 双语闲聊 } from './synthetic-corpus.js'

let 语料 = new 成团语料(八晚闲聊())
for (let 表达 of ['晚安', '门口', '开窍', '枕头', '月票']) {
  let 结果 = 语料.观察(表达)
  console.log(JSON.stringify({ 表达, ...结果 }))
}

let 夜聊 = 双语闲聊()
for (let [范围, 文档] of [
  ['全部夜聊', 夜聊],
  ['日语收尾', 夜聊.slice(0, 8)],
] as const) {
  console.log(JSON.stringify({ 范围, 表达: 'おやすみ', ...new 成团语料(文档).观察('おやすみ') }))
}
