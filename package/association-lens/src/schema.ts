import { z } from 'zod'

function 创建非空文字Schema(): z.ZodEffects<z.ZodString, string, string> {
  return z.string().refine((值) => 值.trim().length > 0, '文字不能全为空白')
}

function 创建原文引用Schema(): z.ZodObject<
  { 引文: z.ZodEffects<z.ZodString, string, string>; 出现序号: z.ZodNumber },
  'strict'
> {
  return z
    .object({
      引文: 创建非空文字Schema().describe('原文逐字引文，保留原有空白与标点'),
      出现序号: z
        .number()
        .int()
        .nonnegative()
        .describe('该引文自身在全文中第几次出现（从0开始，未重复出现的引文一律填0，不是句子或段落序号），含重叠匹配'),
    })
    .strict()
}

function 创建联想判断Schema(): z.ZodObject<
  { 说明: z.ZodEffects<z.ZodString, string, string>; 证据: z.ZodArray<ReturnType<typeof 创建原文引用Schema>> },
  'strict'
> {
  return z.object({ 说明: 创建非空文字Schema(), 证据: z.array(创建原文引用Schema()).min(1) }).strict()
}

export let 非空文字Schema = 创建非空文字Schema()
export let 原文引用Schema = 创建原文引用Schema()
export type 原文引用 = z.infer<typeof 原文引用Schema>
export let 定位证据Schema = 创建原文引用Schema()
  .extend({ 起点: z.number().int().nonnegative(), 终点: z.number().int().positive() })
  .refine((值) => 值.终点 > 值.起点 && 值.终点 - 值.起点 === 值.引文.length, '证据区间长度必须与引文UTF-16长度一致')
export type 定位证据 = z.infer<typeof 定位证据Schema>

export let 联想判断Schema = 创建联想判断Schema()
export let 定位判断Schema = 创建联想判断Schema().extend({ 证据: z.array(定位证据Schema).min(1) })
export let 联想节点Schema = z
  .object({
    节点标识: 创建非空文字Schema(),
    描述: 创建非空文字Schema(),
    领域: 创建非空文字Schema().describe('自由命名的具体领域标签，不套固定学科分类'),
    证据: z.array(创建原文引用Schema()).min(1).describe('共同支持节点描述与领域判断的原文证据'),
  })
  .strict()
export let 定位节点Schema = 联想节点Schema.extend({ 证据: z.array(定位证据Schema).min(1) })
export type 定位节点 = z.infer<typeof 定位节点Schema>

export let 后文发展Schema = 创建联想判断Schema().extend({ 状态: z.enum(['延续', '未见延续', '无法判断']) })
export let 联想关系数据Schema = z
  .object({
    关系标识: 创建非空文字Schema(),
    源节点: 创建非空文字Schema(),
    目标节点: 创建非空文字Schema(),
    连接方式: 创建非空文字Schema().describe('自由命名短标签，其判断由连接依据的证据支撑'),
    连接依据: 创建联想判断Schema(),
    表达作用: 创建联想判断Schema(),
    后文发展: 创建联想判断Schema()
      .extend({ 状态: z.enum(['延续', '未见延续', '无法判断']) })
      .describe('未见延续仅针对所给原文；引文说明检查范围或不确定的语境'),
  })
  .strict()
export let 定位关系Schema = 联想关系数据Schema.extend({
  连接依据: 定位判断Schema,
  表达作用: 定位判断Schema,
  后文发展: 定位判断Schema.extend({ 状态: z.enum(['延续', '未见延续', '无法判断']) }),
})
export type 定位关系 = z.infer<typeof 定位关系Schema>

export let 联想观察结果Schema = z
  .object({
    节点: z.array(联想节点Schema),
    关系: z.array(联想关系数据Schema),
    整体说明: 创建联想判断Schema().describe('总结已观察联想；无联想时解释为何仅为叙事推进、共同出现等并给证据'),
  })
  .strict()
export type 联想观察结果 = z.infer<typeof 联想观察结果Schema>
export let 定位观察结果Schema = 联想观察结果Schema.extend({
  节点: z.array(定位节点Schema),
  关系: z.array(定位关系Schema),
  整体说明: 定位判断Schema,
})
export type 定位观察结果 = z.infer<typeof 定位观察结果Schema>

export let 联想观察输入Schema = z
  .object({
    文本: 非空文字Schema,
    上下文提示: 非空文字Schema.nullable().optional(),
    来源标签: 非空文字Schema.nullable().optional(),
  })
  .strict()
export type 联想观察输入 = z.infer<typeof 联想观察输入Schema>

export let 联想篇章快照Schema = z
  .object({
    版本: z.literal('1'),
    篇章标识: 非空文字Schema,
    原文: 非空文字Schema,
    观察结果: 定位观察结果Schema,
    模型名称: 非空文字Schema,
    记录时间戳: z.number().int().nonnegative(),
    来源标签: 非空文字Schema.nullable(),
  })
  .strict()
export type 联想篇章快照 = z.infer<typeof 联想篇章快照Schema>
export type 联想记录信息 = Pick<联想篇章快照, '篇章标识' | '模型名称' | '记录时间戳' | '来源标签'>
export type 联想关系查询 = { 源节点?: string; 目标节点?: string; 连接方式?: string }
export type 联想链查询 = { 起始节点: string; 最大深度?: number; 最大链数?: number }
export type 联想模式例证 = { 篇章标识: string; 来源标签: string | null; 关系标识: string; 证据: 定位证据[] }
export type 联想模式统计 = { 标签: string[]; 次数: number; 篇数: number; 例证: 联想模式例证[] }
