import { ChainDestinationKind } from '../canon.js'
import {
  DialecticDocumentSnapshot,
  dialecticDocumentSnapshotSchema,
  ElenchusMove,
  ExtractionProvenance,
  ImplicitContentType,
} from '../schema.js'
import { ElenchusChain } from './chain.js'
import { ImplicitContentItem } from './item.js'

/**
 * A DialecticDocument is the complete result of analyzing one text from the Socratic dialectic
 * perspective. It aggregates the original text, the implicit content items the text relies on,
 * the candidate elenchus chains questioning them, the source label, the recording timestamp and
 * the extraction provenance (model and prompt version).
 *
 * Construction re-validates every evidence anchor against the original text, guarantees unique
 * item and chain ids, and guarantees that every chain start resolves to an existing item (move
 * anchors are validated by the chains themselves), so a document restored from a snapshot is
 * guaranteed to be internally consistent and grounded in the exact characters it quotes.
 *
 * The document offers profile queries over the implicit content, per-item questioning lookups
 * (so that an ongoing dialogue never loses track of which hidden premises remain unchallenged),
 * and diagnostics about unprobed items and chain destinations. These describe only the analysis
 * result; the chains are candidate questionings, not behaviors the lens executes.
 */
export class DialecticDocument {
  private readonly 篇章标识: string
  private readonly 原文: string
  private readonly 隐含内容映射: Map<string, ImplicitContentItem>
  private readonly 诘问链列表: ElenchusChain[]
  private readonly 来源标签: string | null
  private readonly 记录时间: number
  private readonly 提取来源: ExtractionProvenance

  public constructor(snapshot: DialecticDocumentSnapshot) {
    let 校验值 = dialecticDocumentSnapshotSchema.parse(snapshot)

    for (let 项 of 校验值.items) {
      let 依据 = 项.evidence
      if (依据.end > 校验值.text.length) {
        throw new Error(`Evidence anchor for implicit content item ${项.id} exceeds the document text length`)
      }
      if (校验值.text.slice(依据.start, 依据.end) !== 依据.quote) {
        throw new Error(`Evidence anchor for implicit content item ${项.id} does not match the document text`)
      }
    }

    this.隐含内容映射 = new Map()
    for (let 项快照 of 校验值.items) {
      if (this.隐含内容映射.has(项快照.id)) {
        throw new Error(`Duplicate implicit content item id in dialectic document: ${项快照.id}`)
      }
      this.隐含内容映射.set(项快照.id, new ImplicitContentItem(项快照))
    }

    this.诘问链列表 = []
    let 已见链标识 = new Set<string>()
    for (let 链快照 of 校验值.chains) {
      if (已见链标识.has(链快照.id)) {
        throw new Error(`Duplicate elenchus chain id in dialectic document: ${链快照.id}`)
      }
      已见链标识.add(链快照.id)
      let 链 = new ElenchusChain(链快照)
      for (let 目标标识 of 链.getTargetItemIds()) {
        if (this.隐含内容映射.has(目标标识) === false) {
          throw new Error(`Elenchus chain ${链.getId()} targets unknown implicit content item: ${目标标识}`)
        }
      }
      this.诘问链列表.push(链)
    }

    this.篇章标识 = 校验值.id
    this.原文 = 校验值.text
    this.来源标签 = 校验值.sourceLabel
    this.记录时间 = 校验值.recordedAt
    this.提取来源 = { ...校验值.provenance }
  }

  public getId(): string {
    return this.篇章标识
  }

  public getText(): string {
    return this.原文
  }

  public getSourceLabel(): string | null {
    return this.来源标签
  }

  public getRecordedAt(): number {
    return this.记录时间
  }

  public getProvenance(): ExtractionProvenance {
    return { ...this.提取来源 }
  }

  public getItem(id: string): ImplicitContentItem | undefined {
    return this.隐含内容映射.get(id)
  }

  public getItems(): ImplicitContentItem[] {
    return [...this.隐含内容映射.values()]
  }

  public getItemsByType(type: ImplicitContentType): ImplicitContentItem[] {
    return [...this.隐含内容映射.values()].filter((项) => 项.getType() === type)
  }

  /**
   * Returns the items concerning the given concept, matched by exact surface form.
   */
  public getItemsByConcept(concept: string): ImplicitContentItem[] {
    return [...this.隐含内容映射.values()].filter((项) => 项.getConcept() === concept)
  }

  /**
   * Lists the distinct concepts the implicit content concerns, in first-seen order.
   */
  public listConcepts(): string[] {
    let 概念列表: string[] = []
    let 已见概念 = new Set<string>()
    for (let 项 of this.隐含内容映射.values()) {
      if (已见概念.has(项.getConcept())) {
        continue
      }
      已见概念.add(项.getConcept())
      概念列表.push(项.getConcept())
    }
    return 概念列表
  }

  /**
   * Case-insensitive keyword search over item restatements and concepts; a blank keyword returns all items.
   */
  public searchItems(keyword: string): ImplicitContentItem[] {
    return [...this.隐含内容映射.values()].filter((项) => 项.matchesKeyword(keyword))
  }

  public getChain(id: string): ElenchusChain | undefined {
    return this.诘问链列表.find((链) => 链.getId() === id)
  }

  public getChains(): ElenchusChain[] {
    return [...this.诘问链列表]
  }

  /**
   * Returns the chains whose start includes the given item.
   */
  public getChainsForItem(itemId: string): ElenchusChain[] {
    this.确保隐含内容存在(itemId)
    return this.诘问链列表.filter((链) => 链.getTargetItemIds().includes(itemId))
  }

  /**
   * Returns every guiding question anchored to the given item, across all chains. This is the
   * core lookup that keeps the speaker's hidden premises under challenge throughout an ongoing
   * dialogue, however the speaker's answers deviate.
   */
  public getMovesForItem(itemId: string): ElenchusMove[] {
    this.确保隐含内容存在(itemId)
    let 结果: ElenchusMove[] = []
    for (let 链 of this.诘问链列表) {
      结果.push(...链.getMovesTargeting(itemId))
    }
    return 结果
  }

  /**
   * Items that no chain challenges. This only means the analysis left them unprobed; it does not
   * judge whether they deserved questioning.
   */
  public findUnprobedItems(): ImplicitContentItem[] {
    let 被追问集合 = new Set<string>()
    for (let 链 of this.诘问链列表) {
      for (let 内容标识 of 链.getTargetItemIds()) {
        被追问集合.add(内容标识)
      }
    }
    return [...this.隐含内容映射.values()].filter((项) => 被追问集合.has(项.getId()) === false)
  }

  /**
   * Chains whose fixed destination is an ascent to an underlying conception.
   */
  public getAscentChains(): ElenchusChain[] {
    return this.诘问链列表.filter((链) => 链.getDestination().kind === 'ascent')
  }

  /**
   * Chains whose fixed destination is an aporia: the analysis judges they cannot ascend.
   */
  public getAporiaChains(): ElenchusChain[] {
    return this.诘问链列表.filter((链) => 链.getDestination().kind === 'aporia')
  }

  /**
   * Destination profile of all chains, covering every destination kind including zero counts.
   */
  public getDestinationProfile(): Record<ChainDestinationKind, number> {
    let 剖面: Record<ChainDestinationKind, number> = { ascent: 0, aporia: 0 }
    for (let 链 of this.诘问链列表) {
      switch (链.getDestination().kind) {
        case 'ascent':
          剖面.ascent += 1
          break
        case 'aporia':
          剖面.aporia += 1
          break
      }
    }
    return 剖面
  }

  public toSnapshot(): DialecticDocumentSnapshot {
    return {
      snapshotVersion: 1,
      id: this.篇章标识,
      text: this.原文,
      items: [...this.隐含内容映射.values()].map((项) => 项.toSnapshot()),
      chains: this.诘问链列表.map((链) => 链.toSnapshot()),
      sourceLabel: this.来源标签,
      recordedAt: this.记录时间,
      provenance: { ...this.提取来源 },
    }
  }

  private 确保隐含内容存在(id: string): void {
    if (this.隐含内容映射.has(id) === false) {
      throw new Error(`Implicit content item not found in dialectic document: ${id}`)
    }
  }
}
