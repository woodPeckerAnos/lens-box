import assert from 'node:assert/strict'
import test from 'node:test'
import { 语言形式透镜 } from '../src/index.js'

void test('切句保留空白和 UTF-16 位置，长度按 Unicode 码点计算', (): void => {
  let 原文 = '  😀数值.5和1.5？！” Next. End\n  尾句  '
  let 快照 = new 语言形式透镜().同步剖析文章({ 文本: 原文 }).导出快照()
  assert.equal(快照.原文, 原文)
  assert.deepEqual(
    快照.句子.map((句) => 句.原文),
    ['  😀数值.5和1.5？！”', ' Next.', ' End', '  尾句  '],
  )
  assert.deepEqual(
    快照.段落.map((段) => 段.原文),
    ['  😀数值.5和1.5？！” Next. End', '  尾句  '],
  )
  for (let 片段 of [...快照.段落, ...快照.句子, ...快照.词项]) {
    assert.equal(原文.slice(片段.起始偏移, 片段.结束偏移), 片段.原文)
  }
  assert.equal(快照.句长节奏[0]?.长度, Array.from('😀数值.5和1.5？！”').length)
  assert.equal(快照.统计.非空白字符数, Array.from(原文).filter((字符) => /\s/u.test(字符) === false).length)
  assert.deepEqual(
    new 语言形式透镜()
      .同步剖析文章({ 文本: '走！.5' })
      .导出快照()
      .句子.map((句) => 句.原文),
    ['走！', '.5'],
  )
})

void test('词项保留字母数字和生僻字，排除标点与 emoji', (): void => {
  let 快照 = new 语言形式透镜().同步剖析文章({ 文本: 'API 123 龘，😀!' }).导出快照()
  let 词 = 快照.词项.map((项) => 项.原文)
  assert.ok(词.includes('API'))
  assert.ok(词.includes('123'))
  assert.ok(词.includes('龘'))
  assert.ok(词.every((项) => /[\p{L}\p{N}]/u.test(项)))
  assert.equal(快照.统计.标点分布.分母, 2)
})

void test('搭配与词性窗口在标点、句子和段落处断开，例证上限不影响次数', (): void => {
  let 透镜 = new 语言形式透镜({ 词性序列长度: 2, 每项例证上限: 1 })
  let 快照 = 透镜.同步剖析文章({ 文本: 'a b a b，c d。e f\ng h；i😀j' }).导出快照()
  let 搭配 = 快照.统计.相邻词搭配
  assert.equal(搭配.分母, 6)
  assert.equal(快照.统计.词性短序列.分母, 6)
  assert.equal(搭配.项目.find((项) => 项.项.join(' ') === 'a b')?.次数, 2)
  assert.equal(搭配.项目.find((项) => 项.项.join(' ') === 'a b')?.例证.length, 1)
  assert.equal(
    搭配.项目.some((项) => ['b c', 'd e', 'f g', 'h i', 'i j'].includes(项.项.join(' '))),
    false,
  )
})

void test('虚词及副词保留在词频中，虚词频率使用全部词项作分母', (): void => {
  let 统计 = new 语言形式透镜().同步剖析文章({ 文本: '雨也来了。风却停了。' }).获得统计()
  for (let 词 of ['也', '却', '了']) {
    let 全词项 = 统计.词频.项目.find((项) => 项.项[0] === 词)
    let 虚词项 = 统计.虚词词项.项目.find((项) => 项.项[0] === 词)
    assert.ok(全词项 !== undefined)
    assert.ok(虚词项 !== undefined)
    assert.equal(虚词项.次数, 全词项.次数)
    assert.equal(虚词项.频率, 全词项.次数 / 统计.词频.分母)
  }
})

void test('纯标点和 emoji 的零词统计安全', (): void => {
  let 统计 = new 语言形式透镜().同步剖析文章({ 文本: '。😀！' }).获得统计()
  assert.deepEqual(统计.词频, { 分母: 0, 项目: [] })
  assert.deepEqual(统计.相邻词搭配, { 分母: 0, 项目: [] })
  assert.deepEqual(统计.词性短序列, { 分母: 0, 项目: [] })
  assert.equal(统计.标点分布.分母, 2)
})
