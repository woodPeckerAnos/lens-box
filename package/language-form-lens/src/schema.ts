import { z } from 'zod'

export let 语言形式配置Schema = z
  .object({
    词性序列长度: z.number().int().min(2).max(4).default(3),
    每项例证上限: z.number().int().min(1).max(20).default(3),
  })
  .strict()

export type 语言形式配置 = z.input<typeof 语言形式配置Schema>
export type 已解析语言形式配置 = z.output<typeof 语言形式配置Schema>

export let 语言形式输入Schema = z
  .object({
    文本: z.string().refine((值) => /\S/u.test(值), '输入文章文本不能为空白'),
    来源标签: z.string().min(1).nullable().default(null),
  })
  .strict()

export type 语言形式输入 = z.input<typeof 语言形式输入Schema>

export let 原文片段Schema = z
  .object({ 起始偏移: z.number().int().nonnegative(), 结束偏移: z.number().int().positive(), 原文: z.string().min(1) })
  .strict()

export type 原文片段 = z.infer<typeof 原文片段Schema>

export let 定位例证Schema = 原文片段Schema
  .extend({
    篇章序号: z.number().int().nonnegative(),
    段落序号: z.number().int().nonnegative(),
    句子序号: z.number().int().nonnegative().nullable(),
  })
  .strict()

export type 定位例证 = z.infer<typeof 定位例证Schema>

export let 形式词项Schema = 原文片段Schema
  .extend({
    词性: z.string().min(1),
    段落序号: z.number().int().nonnegative(),
    句子序号: z.number().int().nonnegative(),
  })
  .strict()

export type 形式词项 = z.infer<typeof 形式词项Schema>

export let 形式句子Schema = 原文片段Schema
  .extend({ 序号: z.number().int().nonnegative(), 段落序号: z.number().int().nonnegative() })
  .strict()

export type 形式句子 = z.infer<typeof 形式句子Schema>

export let 形式段落Schema = 原文片段Schema.extend({ 序号: z.number().int().nonnegative() }).strict()
export type 形式段落 = z.infer<typeof 形式段落Schema>

export let 形式频率项Schema = z
  .object({
    项: z.array(z.string().min(1)).min(1),
    次数: z.number().int().positive(),
    频率: z.number().min(0).max(1),
    例证: z.array(定位例证Schema),
  })
  .strict()

export type 形式频率项 = z.infer<typeof 形式频率项Schema>

export let 形式频率表Schema = z
  .object({ 分母: z.number().int().nonnegative(), 项目: z.array(形式频率项Schema) })
  .strict()

export type 形式频率表 = z.infer<typeof 形式频率表Schema>

export let 长度节奏项Schema = z.object({ 长度: z.number().int().positive(), 例证: 定位例证Schema }).strict()

export type 长度节奏项 = z.infer<typeof 长度节奏项Schema>

export let 语言形式统计Schema = z
  .object({
    非空白字符数: z.number().int().positive(),
    词频: 形式频率表Schema,
    词性分布: 形式频率表Schema,
    虚词词项: 形式频率表Schema,
    相邻词搭配: 形式频率表Schema,
    词性短序列: 形式频率表Schema,
    标点分布: 形式频率表Schema,
    句长分布: 形式频率表Schema,
    段长分布: 形式频率表Schema,
  })
  .strict()

export type 语言形式统计 = z.infer<typeof 语言形式统计Schema>

export let 语言形式篇章快照Schema = z
  .object({
    算法版本: z.literal('1'),
    配置: 语言形式配置Schema,
    原文: z.string().refine((值) => /\S/u.test(值), '原文不能为空白'),
    来源标签: z.string().min(1).nullable(),
    段落: z.array(形式段落Schema).min(1),
    句子: z.array(形式句子Schema).min(1),
    词项: z.array(形式词项Schema),
    句长节奏: z.array(长度节奏项Schema).min(1),
    段长节奏: z.array(长度节奏项Schema).min(1),
    统计: 语言形式统计Schema,
  })
  .strict()

export type 语言形式篇章快照 = z.infer<typeof 语言形式篇章快照Schema>

export type 形式频率差异 = {
  项: string[]
  甲次数: number
  乙次数: number
  甲频率: number
  乙频率: number
  乙减甲: number
}
export type 形式分布差异 = { 甲分母: number; 乙分母: number; 项目: 形式频率差异[] }
export type 语言形式对比 = {
  词频: 形式分布差异
  词性分布: 形式分布差异
  虚词词项: 形式分布差异
  相邻词搭配: 形式分布差异
  词性短序列: 形式分布差异
  标点分布: 形式分布差异
  句长分布: 形式分布差异
  段长分布: 形式分布差异
}

export let 语言形式语料快照Schema = z
  .object({
    算法版本: z.literal('1'),
    配置: 语言形式配置Schema,
    样本数: z.number().int().positive(),
    篇章: z.array(语言形式篇章快照Schema).min(1),
    统计: 语言形式统计Schema,
    句长节奏: z.array(z.array(长度节奏项Schema).min(1)).min(1),
    段长节奏: z.array(z.array(长度节奏项Schema).min(1)).min(1),
  })
  .strict()

export type 语言形式语料快照 = z.infer<typeof 语言形式语料快照Schema>
