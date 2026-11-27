import { DialecticDocument } from './model/document.js'
import {
  DialecticExtractionResult,
  dialecticExtractionResultSchema,
  ElenchusChainSnapshot,
  ElenchusMove,
  ImplicitContentItemSnapshot,
} from './schema.js'

/**
 * Parameters for building a dialectic document from a raw extraction result.
 */
export type BuildDialecticDocumentParams = {
  text: string
  extraction: DialecticExtractionResult
  model: string
  promptVersion: number
  sourceLabel?: string | null
}

/**
 * Builds a validated DialecticDocument from a raw extraction result without any network access.
 *
 * The builder maps the model's temporary item keys to fresh UUIDs, locates each verbatim
 * evidence quote in the original text (honoring the 1-based occurrence index for repeated
 * quotes), resolves every chain start and move anchor, and constructs the final document.
 * It fails fast on duplicate keys, unknown references, unresolvable quotes and invalid
 * provenance metadata.
 */
export function buildDialecticDocument(params: BuildDialecticDocumentParams): DialecticDocument {
  if (params.text.trim().length === 0) {
    throw new Error('Cannot build a dialectic document from empty text')
  }
  if (params.model.trim().length === 0) {
    throw new Error('Extraction provenance model must not be empty')
  }
  if (Number.isInteger(params.promptVersion) === false || params.promptVersion <= 0) {
    throw new Error(`Extraction promptVersion must be a positive integer, got: ${String(params.promptVersion)}`)
  }

  let 提取结果 = dialecticExtractionResultSchema.parse(params.extraction)

  let 标识映射 = new Map<string, string>()
  let 项快照列表: ImplicitContentItemSnapshot[] = []
  for (let 项 of 提取结果.items) {
    if (标识映射.has(项.key)) {
      throw new Error(`Duplicate implicit content item key in extraction result: ${项.key}`)
    }
    let 位置列表 = 查找全部出现位置(params.text, 项.evidence.quote)
    let 起始 = 位置列表[项.evidence.occurrence - 1]
    if (起始 === undefined) {
      throw new Error(
        `Evidence quote for implicit content item "${项.key}" appears ${String(位置列表.length)} time(s) in the text, so occurrence ${String(项.evidence.occurrence)} cannot be resolved`,
      )
    }
    let 标识 = globalThis.crypto.randomUUID()
    标识映射.set(项.key, 标识)
    项快照列表.push({
      id: 标识,
      type: 项.type,
      concept: 项.concept,
      content: 项.content,
      evidence: { quote: 项.evidence.quote, start: 起始, end: 起始 + 项.evidence.quote.length },
    })
  }

  let 解析项标识 = (临时键: string, 引用方: string): string => {
    let 标识 = 标识映射.get(临时键)
    if (标识 === undefined) {
      throw new Error(`${引用方} references unknown implicit content item key: ${临时键}`)
    }
    return 标识
  }

  let 链快照列表: ElenchusChainSnapshot[] = []
  let 已见链键 = new Set<string>()
  for (let 链 of 提取结果.chains) {
    if (已见链键.has(链.key)) {
      throw new Error(`Duplicate elenchus chain key in extraction result: ${链.key}`)
    }
    已见链键.add(链.key)

    let 起点标识列表 = 链.targetItemKeys.map((临时键) => 解析项标识(临时键, `Elenchus chain "${链.key}" start`))
    let 步骤快照列表: ElenchusMove[] = 链.moves.map((步骤) => ({
      form: 步骤.form,
      question: 步骤.question,
      aim: 步骤.aim,
      targetItemIds: 步骤.targetItemKeys.map((临时键) => 解析项标识(临时键, `A move of elenchus chain "${链.key}"`)),
    }))

    链快照列表.push({
      id: globalThis.crypto.randomUUID(),
      concept: 链.concept,
      targetItemIds: 起点标识列表,
      destination: 链.destination,
      moves: 步骤快照列表,
    })
  }

  return new DialecticDocument({
    snapshotVersion: 1,
    id: globalThis.crypto.randomUUID(),
    text: params.text,
    items: 项快照列表,
    chains: 链快照列表,
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
