import assert from 'node:assert/strict'
import test from 'node:test'
import { 八晚闲聊, 双语闲聊 } from '../demo/synthetic-corpus.js'
import { 成团语料 } from '../src/index.js'

void test('八晚闲聊中同频的门口和开窍分别覆盖三晚和两晚', () => {
  let 语料 = new 成团语料(八晚闲聊())
  for (let [表达, 篇数, 次数] of [
    ['晚安', 8, 8],
    ['门口', 3, 3],
    ['开窍', 2, 3],
  ] as const) {
    let 结果 = 语料.观察(表达)
    assert.equal(结果.状态, '已校准')
    assert.equal(结果.总次数, 次数)
    assert.equal(结果.覆盖篇数, 篇数)
    assert.equal(结果.参照.样本数, 次数 === 8 ? 13 : 14)
    assert.equal(结果.参照.档位, Math.floor(Math.log2(次数)))
    assert.ok(Math.abs(结果.泊松期望篇数 - 8 * (1 - Math.exp(-次数 / 8))) < 1e-12)
    assert.ok(Math.abs(结果.成团分数 - Math.log((次数 === 8 ? 8 : 2) / 篇数)) < 1e-12)
  }
  assert.deepEqual(语料.观察('开窍').分布, [
    { 文档序号: 0, 次数: 1 },
    { 文档序号: 2, 次数: 2 },
  ])
})

void test('未出现、低频、结构不足以建立参照分别返回原因', () => {
  let 语料 = new 成团语料(八晚闲聊())
  assert.equal(语料.观察('月票').状态, '未出现')
  assert.equal(语料.观察('枕头').状态, '出现不足三次')
  let 结果 = new 成团语料(['哈哈哈哈', '。']).观察('哈哈')
  assert.deepEqual([结果.状态, 结果.总次数, 结果.成团分数], ['缺少参照', 3, null])
})

void test('重叠和非 BMP 字符按原文匹配，大小写有别，文档边界隔开', () => {
  let 语料 = new 成团语料(['🍋🍋🍋🍋 AB', 'C'])
  assert.equal(语料.观察('🍋🍋').总次数, 3)
  assert.equal(语料.观察('ab').总次数, 0)
  assert.equal(语料.观察('BC').总次数, 0)
  let 字符语料 = new 成团语料(Array<string>(8).fill('🍋梨\n🍎梨\n🍑梨\n🍊梨\n🍒梨'))
  let 结果 = 字符语料.观察('🍋梨')
  assert.equal(结果.状态, '已校准')
  assert.equal(结果.参照.样本数, 5)
  assert.equal(结果.成团分数, 0)
})

void test('隔行不会拼成参照，只有四个字串的桶不参与校准', () => {
  let 语料 = new 成团语料(Array<string>(8).fill('称重\n测温\n封箱\n复核'))
  assert.equal(语料.观察('称重').状态, '缺少参照')
})

void test('上下两个有效参照桶等距时使用低档，并标明借用的档位', () => {
  let 语料 = new 成团语料(
    Array.from({ length: 8 }, (_, 号) => {
      let 高频 = ['丙一', '丙二', '丙三', '丙四', '丙五']
      let 低频 = 号 < 4 ? ['甲一', '甲二', '甲三', '甲四', '甲五'] : []
      return [...低频, '乙一', ...高频, ...高频].join('\n')
    }),
  )
  let 结果 = 语料.观察('乙一')
  assert.equal(结果.状态, '已校准')
  assert.deepEqual([结果.目标档位, 结果.参照.档位, 结果.参照.样本数], [3, 2, 5])
})

void test('控制语料的语言构成可改变成团分数', () => {
  let 全部 = 双语闲聊()
  let 混合 = new 成团语料(全部).观察('おやすみ')
  let 日文 = new 成团语料(全部.slice(0, 8)).观察('おやすみ')
  assert.equal(混合.状态, '已校准')
  assert.equal(日文.状态, '已校准')
  assert.deepEqual([混合.总次数, 混合.覆盖篇数, 日文.总次数, 日文.覆盖篇数], [16, 8, 16, 8])
  assert.equal(混合.参照.样本数, 45)
  assert.equal(混合.成团分数, Math.log(2))
  assert.equal(日文.成团分数, 0)
})

void test('输入及返回值可在调用方修改，既有语料仍可复现原观察', () => {
  let 文档 = 八晚闲聊()
  let 语料 = new 成团语料(文档, { 种子: 47, 样本上限: 900 })
  let 复算 = new 成团语料(文档, { 种子: 47, 样本上限: 900 }).观察('开窍')
  let 首次 = 语料.观察('开窍')
  assert.deepEqual(首次, 复算)
  assert.equal(首次.状态, '已校准')
  首次.参照.档位 = -1
  首次.分布.length = 0
  文档.fill('另文')
  assert.deepEqual(语料.观察('开窍'), 复算)
})

void test('非法单位、词形与采样参数在入口报告错误', () => {
  assert.throws(() => new 成团语料(['正文']))
  assert.throws(() => new 成团语料(['正文', '  ']))
  assert.throws(() => new 成团语料(八晚闲聊(), { 样本上限: 0 }))
  assert.throws(() => new 成团语料(八晚闲聊(), { 种子: 1.5 }))
  let 语料 = new 成团语料(八晚闲聊())
  for (let 词 of ['', '跨\n行', ' 前置空格']) assert.throws(() => 语料.观察(词))
})

void test('同频参照集中在少数文档时，较分散的表达得到负分', () => {
  let 文档 = Array.from({ length: 8 }, (_, 篇号) => {
    let 同档参照 = ['甲一', '甲二', '甲三', '甲四', '甲五']
    return (篇号 < 2 ? ['晚安', ...Array<string[]>(4).fill(同档参照).flat()] : ['晚安']).join('\n')
  })
  let 观察 = new 成团语料(文档).观察('晚安')
  assert.equal(观察.状态, '已校准')
  assert.equal(观察.参照.样本数, 6)
  assert.equal(观察.成团分数, Math.log(2 / 8))
})

void test('六个同频参照中三项集中、三项分散，取上中位数', () => {
  let 文档 = Array.from({ length: 8 }, (_, 号) => {
    let 串 = ['甲一', '甲二', '甲三']
    if (号 < 2) 串.push(...Array<string[]>(4).fill(['乙一', '乙二', '乙三']).flat())
    return 串.join('\n')
  })
  let 观察 = new 成团语料(文档).观察('甲一')
  assert.equal(观察.状态, '已校准')
  assert.equal(观察.参照.样本数, 6)
  assert.equal(观察.成团分数, 0)
})
