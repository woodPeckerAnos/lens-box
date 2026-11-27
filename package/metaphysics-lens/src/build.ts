import { MetaphysicsDocument } from './model/document.js'
import { MetaphysicalClaimSnapshot, MetaphysicsExtractionResult, metaphysicsExtractionResultSchema } from './schema.js'

/**
 * Parameters for building a metaphysics document from a raw extraction result.
 */
export type BuildMetaphysicsDocumentParams = {
  text: string
  extraction: MetaphysicsExtractionResult
  model: string
  promptVersion: number
  sourceLabel?: string | null
}

/**
 * Builds a validated MetaphysicsDocument from a raw extraction result without any network access.
 *
 * The builder maps the model's temporary claim keys to fresh UUIDs, locates each verbatim
 * evidence quote in the original text (honoring the 1-based occurrence index for repeated
 * quotes) and constructs the final document. It fails fast on duplicate keys, unresolvable
 * quotes and invalid provenance metadata.
 */
export function buildMetaphysicsDocument(params: BuildMetaphysicsDocumentParams): MetaphysicsDocument {
  if (params.text.trim().length === 0) {
    throw new Error('Cannot build a metaphysics document from empty text')
  }
  if (params.model.trim().length === 0) {
    throw new Error('Extraction provenance model must not be empty')
  }
  if (Number.isInteger(params.promptVersion) === false || params.promptVersion <= 0) {
    throw new Error(`Extraction promptVersion must be a positive integer, got: ${String(params.promptVersion)}`)
  }

  let 提取结果 = metaphysicsExtractionResultSchema.parse(params.extraction)

  let 已见标识键 = new Set<string>()
  let 断言快照列表: MetaphysicalClaimSnapshot[] = []
  for (let 断言 of 提取结果.claims) {
    if (已见标识键.has(断言.key)) {
      throw new Error(`Duplicate claim key in extraction result: ${断言.key}`)
    }
    已见标识键.add(断言.key)
    let 位置列表 = 查找全部出现位置(params.text, 断言.evidence.quote)
    let 起始 = 位置列表[断言.evidence.occurrence - 1]
    if (起始 === undefined) {
      throw new Error(
        `Evidence quote for claim "${断言.key}" appears ${String(位置列表.length)} time(s) in the text, so occurrence ${String(断言.evidence.occurrence)} cannot be resolved`,
      )
    }
    断言快照列表.push({
      id: globalThis.crypto.randomUUID(),
      category: 断言.category,
      content: 断言.content,
      evidence: { quote: 断言.evidence.quote, start: 起始, end: 起始 + 断言.evidence.quote.length },
      subjects: [...断言.subjects],
    })
  }

  return new MetaphysicsDocument({
    snapshotVersion: 1,
    id: globalThis.crypto.randomUUID(),
    text: params.text,
    claims: 断言快照列表,
    sourceLabel: params.sourceLabel ?? null,
    recordedAt: Date.now(),
    provenance: { model: params.model, promptVersion: params.promptVersion },
  })
}

/**
 * Finds the start offsets of every non-overlapping exact occurrence of a quote in the text.
 */
function 查找全部出现位置(文本: string, 摘录: string): number[] {
  let 位置列表: number[] = []
  let 游标 = 0
  let 命中 = 文本.indexOf(摘录, 游标)
  while (命中 !== -1) {
    位置列表.push(命中)
    游标 = 命中 + 摘录.length
    命中 = 文本.indexOf(摘录, 游标)
  }
  return 位置列表
}
