import {
  EvidenceAnchor,
  ImplicitContentItemSnapshot,
  implicitContentItemSnapshotSchema,
  ImplicitContentType,
} from '../schema.js'

/**
 * An ImplicitContentItem is a single piece of content a text implicitly relies on without stating
 * it outright: a hidden premise, an assumption, an unclearly defined concept usage or a piece of
 * naive common sense taken as true by default.
 * It holds the item's id, kind, the concept it concerns, a restatement and the verbatim evidence
 * anchor that grounds it in the original text.
 * It supports keyword matching and snapshot export; all accessors return copies.
 */
export class ImplicitContentItem {
  private readonly 内容标识: string
  private readonly 内容类型: ImplicitContentType
  private readonly 涉及概念: string
  private readonly 内容重述: string
  private readonly 原文依据: EvidenceAnchor

  public constructor(snapshot: ImplicitContentItemSnapshot) {
    let 校验值 = implicitContentItemSnapshotSchema.parse(snapshot)
    this.内容标识 = 校验值.id
    this.内容类型 = 校验值.type
    this.涉及概念 = 校验值.concept
    this.内容重述 = 校验值.content
    this.原文依据 = { ...校验值.evidence }
  }

  public getId(): string {
    return this.内容标识
  }

  public getType(): ImplicitContentType {
    return this.内容类型
  }

  public getConcept(): string {
    return this.涉及概念
  }

  public getContent(): string {
    return this.内容重述
  }

  public getEvidence(): EvidenceAnchor {
    return { ...this.原文依据 }
  }

  /**
   * Case-insensitive substring match against the restatement and the concept.
   * A blank keyword matches every item.
   */
  public matchesKeyword(keyword: string): boolean {
    let 归一化关键词 = keyword.trim().toLowerCase()
    if (归一化关键词.length === 0) {
      return true
    }
    return this.内容重述.toLowerCase().includes(归一化关键词) || this.涉及概念.toLowerCase().includes(归一化关键词)
  }

  public toSnapshot(): ImplicitContentItemSnapshot {
    return {
      id: this.内容标识,
      type: this.内容类型,
      concept: this.涉及概念,
      content: this.内容重述,
      evidence: { ...this.原文依据 },
    }
  }
}
