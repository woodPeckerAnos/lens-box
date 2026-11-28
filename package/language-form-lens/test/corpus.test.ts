import assert from 'node:assert/strict'
import test from 'node:test'
import { 语言形式篇章, 语言形式语料, 语言形式透镜 } from '../src/index.js'

void test('频率分母与对比差值使用各篇实际词数', (): void => {
  let 透镜 = new 语言形式透镜()
  let 甲 = 透镜.同步剖析文章({ 文本: 'a a b' })
  let 乙 = 透镜.同步剖析文章({ 文本: 'a c' })
  let 甲统计 = 甲.获得统计()
  assert.equal(甲统计.词频.分母, 3)
  assert.equal(甲统计.词性分布.分母, 3)
  assert.equal(甲统计.虚词词项.分母, 3)
  let 差异 = 甲.对比另一篇章(乙).词频
  assert.equal(差异.甲分母, 3)
  assert.equal(差异.乙分母, 2)
  let 项 = 差异.项目.find((值) => 值.项[0] === 'a')
  assert.ok(项 !== undefined)
  assert.equal(项.甲次数, 2)
  assert.equal(项.乙次数, 1)
  assert.equal(项.乙减甲, 1 / 2 - 2 / 3)
  let 缺项 = 差异.项目.find((值) => 值.项[0] === 'c')
  assert.ok(缺项 !== undefined)
  assert.equal(缺项.甲频率, 0)
  assert.equal(缺项.乙减甲, 1 / 2)
})

void test('语料按次数合并，例证定位和节奏保留篇章边界', (): void => {
  let 透镜 = new 语言形式透镜({ 每项例证上限: 3 })
  let 甲 = 透镜.同步剖析文章({ 文本: 'a' })
  let 乙 = 透镜.同步剖析文章({ 文本: 'a b b b' })
  let 语料 = new 语言形式语料([甲, 乙])
  let 快照 = 语料.导出快照()
  assert.equal(语料.获得样本数(), 2)
  assert.equal(快照.统计.词频.分母, 5)
  let 项 = 快照.统计.词频.项目.find((值) => 值.项[0] === 'a')
  assert.ok(项 !== undefined)
  assert.equal(项.次数, 2)
  assert.equal(项.频率, 2 / 5)
  assert.deepEqual(
    项.例证.map((例证) => 例证.篇章序号),
    [0, 1],
  )
  assert.equal(快照.统计.相邻词搭配.分母, 3)
  assert.deepEqual(
    快照.句长节奏.map((篇) => 篇.map((项) => 项.例证.篇章序号)),
    [[0], [1]],
  )
  assert.deepEqual(
    快照.段长节奏.map((篇) => 篇.map((项) => 项.例证.篇章序号)),
    [[0], [1]],
  )
  assert.equal(快照.篇章[1]?.句长节奏[0]?.例证.篇章序号, 0)
})

void test('篇章与语料快照可恢复，篡改位置、次数或样本数会被拒绝', (): void => {
  let 篇章 = new 语言形式透镜().同步剖析文章({ 文本: 'a a b。' })
  let 语料 = new 语言形式语料([篇章])
  let 篇章快照 = 篇章.导出快照()
  let 语料快照 = 语料.导出快照()
  assert.deepEqual(语言形式篇章.从快照恢复(篇章快照).导出快照(), 篇章快照)
  assert.deepEqual(语言形式语料.从快照恢复(语料快照).导出快照(), 语料快照)
  let 位置篡改 = structuredClone(篇章快照)
  let 句子 = 位置篡改.句子[0]
  assert.ok(句子 !== undefined)
  句子.起始偏移 += 1
  assert.throws((): void => {
    语言形式篇章.从快照恢复(位置篡改)
  })
  let 次数篡改 = structuredClone(篇章快照)
  let 词频项 = 次数篡改.统计.词频.项目[0]
  assert.ok(词频项 !== undefined)
  词频项.次数 += 1
  assert.throws((): void => {
    语言形式篇章.从快照恢复(次数篡改)
  })
  语料快照.样本数 += 1
  assert.throws((): void => {
    语言形式语料.从快照恢复(语料快照)
  })
})

void test('导出的快照和统计是独立副本', (): void => {
  let 篇章 = new 语言形式透镜().同步剖析文章({ 文本: 'a b' })
  let 语料 = new 语言形式语料([篇章])
  let 原篇章 = 篇章.导出快照()
  let 原语料 = 语料.导出快照()
  篇章.获得统计().词频.项目.length = 0
  篇章.导出快照().词项.length = 0
  语料.获得统计().词频.项目.length = 0
  语料.导出快照().篇章.length = 0
  assert.deepEqual(篇章.导出快照(), 原篇章)
  assert.deepEqual(语料.导出快照(), 原语料)
})

void test('非法输入、配置、空语料及不同配置的比较与聚合被拒绝', (): void => {
  assert.throws((): void => {
    new 语言形式透镜({ 词性序列长度: 1 })
  })
  assert.throws((): void => {
    new 语言形式透镜({ 每项例证上限: 0 })
  })
  assert.throws((): void => {
    new 语言形式透镜().同步剖析文章({ 文本: ' \n\t' })
  })
  assert.throws((): void => {
    new 语言形式语料([])
  })
  let 甲 = new 语言形式透镜().同步剖析文章({ 文本: 'a' })
  let 乙 = new 语言形式透镜({ 词性序列长度: 2 }).同步剖析文章({ 文本: 'b' })
  assert.throws((): void => {
    甲.对比另一篇章(乙)
  })
  assert.throws((): void => {
    new 语言形式语料([甲, 乙])
  })
  assert.throws((): void => {
    new 语言形式语料([甲]).对比另一语料(new 语言形式语料([乙]))
  })
})
