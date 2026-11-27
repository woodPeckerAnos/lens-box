import { z } from 'zod'

/**
 * Kind of content a text implicitly relies on without stating it outright.
 * - `hiddenPremise`: a premise the speaker argues from but never states.
 * - `assumption`: a supposition the text takes for granted.
 * - `unclearDefinition`: a concept the text uses without a clear definition.
 * - `defaultCommonSense`: naive common sense the text treats as true by default.
 */
export let implicitContentTypeSchema = z.enum([
  'hiddenPremise',
  'assumption',
  'unclearDefinition',
  'defaultCommonSense',
])

export type ImplicitContentType = z.infer<typeof implicitContentTypeSchema>

/**
 * Socratic questioning form of a single guiding move.
 * - `definitionProbe`: asks what the concept itself is (the What-is-X question).
 * - `premiseProbe`: asks what a claim presupposes.
 * - `clarificationProbe`: asks which sense of a term is meant.
 * - `consistencyProbe`: asks whether a claim coheres with another commitment.
 * - `counterexampleProbe`: asks whether there is a case where the claim fails.
 * - `ascentProbe`: setting examples aside, asks what the concept is in itself.
 */
export let elenchusQuestionFormSchema = z.enum([
  'definitionProbe',
  'premiseProbe',
  'clarificationProbe',
  'consistencyProbe',
  'counterexampleProbe',
  'ascentProbe',
])

export type ElenchusQuestionForm = z.infer<typeof elenchusQuestionFormSchema>

/**
 * Input accepted by the dialectic lens.
 */
export let dialecticInputSchema = z.object({
  text: z.string().trim().min(1, 'Input text must not be empty'),
  context: z.string().trim().min(1).nullable().optional(),
  sourceLabel: z.string().trim().min(1).nullable().optional(),
})

export type DialecticInput = z.infer<typeof dialecticInputSchema>

/**
 * An implicit content item as returned by the extraction model, before local validation and ID mapping.
 */
export let extractedImplicitItemSchema = z.object({
  key: z.string().trim().min(1).describe('Temporary identifier unique within this extraction, e.g. "i1"'),
  type: implicitContentTypeSchema.describe('Kind of implicit content'),
  concept: z
    .string()
    .trim()
    .min(1)
    .describe('The concept or theme this implicit content concerns, in the same language as the source text'),
  content: z
    .string()
    .trim()
    .min(1)
    .describe('Concise, self-contained restatement of the implicit content, in the same language as the source text'),
  evidence: z.object({
    quote: z.string().min(1).describe('Verbatim contiguous quote copied exactly from the source text'),
    occurrence: z
      .number()
      .int()
      .min(1)
      .describe('1-based occurrence index used when the same quote appears multiple times in the text'),
  }),
})

export type ExtractedImplicitItem = z.infer<typeof extractedImplicitItemSchema>

/**
 * A single guiding question as returned by the extraction model. Every move is anchored to the
 * implicit items it is responsible to, and to nothing else: a move never depends on the answer to
 * a previous question, so the questioning cannot drift when the speaker's answers deviate.
 */
export let extractedChainMoveSchema = z.object({
  form: elenchusQuestionFormSchema.describe('The Socratic questioning form of this move'),
  question: z
    .string()
    .trim()
    .min(1)
    .describe('The question itself, phrased so it could be asked to the speaker verbatim'),
  aim: z
    .string()
    .trim()
    .min(1)
    .describe('What this question challenges or clarifies about its anchored implicit content'),
  targetItemKeys: z
    .array(z.string().trim().min(1))
    .min(1)
    .describe(
      'Temporary keys of the implicit items this move is responsible to; must belong to the chain targetItemKeys',
    ),
})

export type ExtractedChainMove = z.infer<typeof extractedChainMoveSchema>

/**
 * The fixed destination of an elenchus chain, determined when the chain is designed rather than
 * emerging during questioning.
 * - `ascent`: the questioning guides the speaker toward their underlying conception of the concept
 *   (in the ordinary sense of "idea", not the Platonic Form), restated together with a tentative
 *   essential definition.
 * - `aporia`: the honest judgement that this line of questioning cannot ascend, with the reason.
 */
export let chainDestinationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('ascent'),
    idea: z.string().trim().min(1).describe("Restatement of the speaker's underlying conception reached by the ascent"),
    essentialDefinition: z.string().trim().min(1).describe('Tentative essential definition of the concept'),
  }),
  z.object({
    kind: z.literal('aporia'),
    note: z.string().trim().min(1).describe('Why this line of questioning cannot ascend to a coherent conception'),
  }),
])

export type ChainDestination = z.infer<typeof chainDestinationSchema>

/**
 * An elenchus chain as returned by the extraction model. A chain is a guided path between two
 * fixed endpoints: its start (the implicit items it challenges) and its destination are both
 * determined when the chain is designed; the moves are only the realization of the line between
 * them.
 */
export let extractedElenchusChainSchema = z.object({
  key: z.string().trim().min(1).describe('Temporary identifier unique within this extraction, e.g. "c1"'),
  concept: z.string().trim().min(1).describe('The concept this chain orbits, in the same language as the source text'),
  targetItemKeys: z
    .array(z.string().trim().min(1))
    .min(1)
    .describe('The fixed start of the chain: temporary keys of the implicit items it challenges'),
  destination: chainDestinationSchema.describe('The fixed end of the chain, determined when the chain is designed'),
  moves: z
    .array(extractedChainMoveSchema)
    .min(1)
    .describe('The guiding questions realizing the line between start and destination; order is presentational only'),
})

export type ExtractedElenchusChain = z.infer<typeof extractedElenchusChainSchema>

/**
 * Structured result expected from the extraction model. Referential and uniqueness constraints
 * are enforced here so validation failures are fed back to the model for retry; the local builder
 * re-validates them independently.
 */
export let dialecticExtractionResultSchema = z
  .object({
    items: z
      .array(extractedImplicitItemSchema)
      .describe('All implicit content the text relies on; empty when the text relies on none'),
    chains: z
      .array(extractedElenchusChainSchema)
      .describe('Candidate elenchus chains questioning the implicit content; empty when no items were found'),
  })
  .superRefine((结果, 上下文) => {
    let 项键集合 = new Set<string>()
    结果.items.forEach((项, 项序号) => {
      if (项键集合.has(项.key)) {
        上下文.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', 项序号, 'key'],
          message: `Duplicate implicit content item key: ${项.key}`,
        })
      }
      项键集合.add(项.key)
    })

    let 链键集合 = new Set<string>()
    结果.chains.forEach((链, 链序号) => {
      if (链键集合.has(链.key)) {
        上下文.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['chains', 链序号, 'key'],
          message: `Duplicate elenchus chain key: ${链.key}`,
        })
      }
      链键集合.add(链.key)

      let 起点键集合 = new Set<string>()
      链.targetItemKeys.forEach((锚定键, 起点序号) => {
        if (起点键集合.has(锚定键)) {
          上下文.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['chains', 链序号, 'targetItemKeys', 起点序号],
            message: `Duplicate target item key in chain "${链.key}": ${锚定键}`,
          })
        }
        起点键集合.add(锚定键)
        if (项键集合.has(锚定键) === false) {
          上下文.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['chains', 链序号, 'targetItemKeys', 起点序号],
            message: `Chain "${链.key}" targets unknown implicit content item key: ${锚定键}`,
          })
        }
      })

      链.moves.forEach((步骤, 步骤序号) => {
        let 步骤锚定键集合 = new Set<string>()
        步骤.targetItemKeys.forEach((锚定键, 锚定序号) => {
          if (步骤锚定键集合.has(锚定键)) {
            上下文.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['chains', 链序号, 'moves', 步骤序号, 'targetItemKeys', 锚定序号],
              message: `Duplicate anchored item key in move ${String(步骤序号 + 1)} of chain "${链.key}": ${锚定键}`,
            })
          }
          步骤锚定键集合.add(锚定键)
          if (起点键集合.has(锚定键) === false) {
            上下文.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['chains', 链序号, 'moves', 步骤序号, 'targetItemKeys', 锚定序号],
              message: `Move ${String(步骤序号 + 1)} of chain "${链.key}" anchors to "${锚定键}" outside the chain targetItemKeys`,
            })
          }
        })
      })
    })
  })

export type DialecticExtractionResult = z.infer<typeof dialecticExtractionResultSchema>

/**
 * Exact location of a verbatim quote inside the original text, as a [start, end) character range.
 */
export let evidenceAnchorSchema = z
  .object({ quote: z.string().min(1), start: z.number().int().nonnegative(), end: z.number().int().positive() })
  .refine((锚点) => 锚点.end > 锚点.start, { message: 'Evidence anchor end must be greater than start' })

export type EvidenceAnchor = z.infer<typeof evidenceAnchorSchema>

/**
 * Persisted form of a single implicit content item.
 */
export let implicitContentItemSnapshotSchema = z.object({
  id: z.string().min(1),
  type: implicitContentTypeSchema,
  concept: z.string().min(1),
  content: z.string().min(1),
  evidence: evidenceAnchorSchema,
})

export type ImplicitContentItemSnapshot = z.infer<typeof implicitContentItemSnapshotSchema>

/**
 * Persisted form of a single guiding question inside an elenchus chain.
 */
export let elenchusMoveSchema = z.object({
  form: elenchusQuestionFormSchema,
  question: z.string().min(1),
  aim: z.string().min(1),
  targetItemIds: z.array(z.string().min(1)).min(1),
})

export type ElenchusMove = z.infer<typeof elenchusMoveSchema>

/**
 * Persisted form of a whole elenchus chain.
 */
export let elenchusChainSnapshotSchema = z.object({
  id: z.string().min(1),
  concept: z.string().min(1),
  targetItemIds: z.array(z.string().min(1)).min(1),
  destination: chainDestinationSchema,
  moves: z.array(elenchusMoveSchema).min(1),
})

export type ElenchusChainSnapshot = z.infer<typeof elenchusChainSnapshotSchema>

/**
 * Records which model and prompt version produced the extraction, for audit and reproducibility.
 */
export let extractionProvenanceSchema = z.object({
  model: z.string().min(1),
  promptVersion: z.number().int().positive(),
})

export type ExtractionProvenance = z.infer<typeof extractionProvenanceSchema>

/**
 * Persisted form of a fully analyzed dialectic document.
 */
export let dialecticDocumentSnapshotSchema = z.object({
  snapshotVersion: z.literal(1),
  id: z.string().min(1),
  text: z.string().min(1),
  items: z.array(implicitContentItemSnapshotSchema),
  chains: z.array(elenchusChainSnapshotSchema),
  sourceLabel: z.string().nullable(),
  recordedAt: z.number().int().nonnegative(),
  provenance: extractionProvenanceSchema,
})

export type DialecticDocumentSnapshot = z.infer<typeof dialecticDocumentSnapshotSchema>
