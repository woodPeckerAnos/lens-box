import { z } from 'zod'

/**
 * 形而上学范畴：一条发言中的断言在传统形而上学论题空间里的归属。
 * - `substance`：实体断言，把某物当作独立自存、承载属性的者。
 * - `accident`：偶性断言，把某物当作依附于承载者的属性或规定。
 * - `essence`：本质断言，陈述某物之为某物的定义性规定。
 * - `existence`：存在断言，陈述某物存在、实存或具有是。
 * - `materialCause`：质料因断言，以“由什么构成”解释某物。
 * - `formalCause`：形式因断言，以“具有什么形式或结构”解释某物。
 * - `efficientCause`：动力因断言，以“由什么造成或推动”解释某物。
 * - `finalCause`：目的因断言，以“为了什么目的”解释某物。
 * - `universal`：共相断言，把某物当作可为多个个别者共享的普遍者。
 * - `particular`：殊相断言，把某物当作“这一个”个别者。
 * - `potentiality`：潜能断言，陈述某物能够成为或能够做到什么。
 * - `actuality`：现实断言，陈述某物当下已经实现或正在现实地是什么。
 * - `necessity`：必然断言，陈述某物必然如此、不可能不如此。
 * - `contingency`：偶然断言，陈述某物碰巧如此、本可以不如此。
 * - `time`：时间断言，涉及先后、持续、过去现在未来等时间性规定。
 * - `change`：变化断言，陈述某物生成、改变或运动。
 * - `identity`：同一性断言，陈述某物与自身或他者的同一、持存。
 * - `unity`：一断言，陈述某物的统一性、整体性。
 * - `multiplicity`：多断言，陈述某物的部分、多样性或复多性。
 */
export let metaphysicalCategorySchema = z.enum([
  'substance',
  'accident',
  'essence',
  'existence',
  'materialCause',
  'formalCause',
  'efficientCause',
  'finalCause',
  'universal',
  'particular',
  'potentiality',
  'actuality',
  'necessity',
  'contingency',
  'time',
  'change',
  'identity',
  'unity',
  'multiplicity',
])

export type MetaphysicalCategory = z.infer<typeof metaphysicalCategorySchema>

/**
 * 形而上学透镜的输入。
 */
export let metaphysicsInputSchema = z.object({
  text: z.string().trim().min(1, 'Input text must not be empty'),
  context: z.string().trim().min(1).nullable().optional(),
  sourceLabel: z.string().trim().min(1).nullable().optional(),
})

export type MetaphysicsInput = z.infer<typeof metaphysicsInputSchema>

/**
 * A metaphysical claim as returned by the extraction model, before local validation and ID
 * mapping. Duplicate subjects (after trimming) are rejected here so the extraction agent can
 * retry and repair them during structured output validation, before any local document is built.
 */
export let extractedClaimSchema = z.object({
  key: z.string().trim().min(1).describe('Temporary identifier unique within this extraction, e.g. "c1"'),
  category: metaphysicalCategorySchema.describe('The single dominant metaphysical category of the claim'),
  content: z
    .string()
    .trim()
    .min(1)
    .describe('Concise, self-contained restatement of the claim, in the same language as the source text'),
  evidence: z.object({
    quote: z.string().min(1).describe('Verbatim contiguous quote copied exactly from the source text'),
    occurrence: z
      .number()
      .int()
      .min(1)
      .describe('1-based occurrence index used when the same quote appears multiple times in the text'),
  }),
  subjects: z
    .array(z.string().trim().min(1))
    .min(1)
    .superRefine((主体列表, 上下文) => {
      let 已见主体 = new Set<string>()
      for (let 主体 of 主体列表) {
        if (已见主体.has(主体)) {
          上下文.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate subject in claim: ${主体}` })
        }
        已见主体.add(主体)
      }
    })
    .describe('Surface forms of the entities the claim is about, copied from the source text'),
})

export type ExtractedClaim = z.infer<typeof extractedClaimSchema>

/**
 * Structured result expected from the extraction model.
 */
export let metaphysicsExtractionResultSchema = z.object({
  claims: z
    .array(extractedClaimSchema)
    .describe('All explicitly asserted metaphysical claims; empty when the text asserts nothing metaphysical'),
})

export type MetaphysicsExtractionResult = z.infer<typeof metaphysicsExtractionResultSchema>

/**
 * Exact location of a verbatim quote inside the original text, as a [start, end) character range.
 */
export let evidenceAnchorSchema = z
  .object({ quote: z.string().min(1), start: z.number().int().nonnegative(), end: z.number().int().positive() })
  .refine((锚点) => 锚点.end > 锚点.start, { message: 'Evidence anchor end must be greater than start' })

export type EvidenceAnchor = z.infer<typeof evidenceAnchorSchema>

/**
 * Persisted form of a single metaphysical claim.
 */
export let metaphysicalClaimSnapshotSchema = z.object({
  id: z.string().min(1),
  category: metaphysicalCategorySchema,
  content: z.string().min(1),
  evidence: evidenceAnchorSchema,
  subjects: z.array(z.string().min(1)).min(1),
})

export type MetaphysicalClaimSnapshot = z.infer<typeof metaphysicalClaimSnapshotSchema>

/**
 * Records which model and prompt version produced the extraction, for audit and reproducibility.
 */
export let extractionProvenanceSchema = z.object({
  model: z.string().min(1),
  promptVersion: z.number().int().positive(),
})

export type ExtractionProvenance = z.infer<typeof extractionProvenanceSchema>

/**
 * Persisted form of a fully analyzed metaphysics document.
 */
export let metaphysicsDocumentSnapshotSchema = z.object({
  snapshotVersion: z.literal(1),
  id: z.string().min(1),
  text: z.string().min(1),
  claims: z.array(metaphysicalClaimSnapshotSchema),
  sourceLabel: z.string().nullable(),
  recordedAt: z.number().int().nonnegative(),
  provenance: extractionProvenanceSchema,
})

export type MetaphysicsDocumentSnapshot = z.infer<typeof metaphysicsDocumentSnapshotSchema>
