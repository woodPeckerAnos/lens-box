import { getCategoryLabel } from '../ontology.js'
import {
  EvidenceAnchor,
  MetaphysicalCategory,
  MetaphysicalClaimSnapshot,
  metaphysicalClaimSnapshotSchema,
} from '../schema.js'

/**
 * 形而上学断言是发言中一条被识别出的、归属于某个形而上学范畴的显式断言。
 * 里面记录了断言的标识、所属范畴、自然语言重述、逐字原文依据（`quote` + `[start, end)` 字符区间）
 * 以及断言所涉及的主体表面形式列表。
 * 支持关键词匹配与快照导出；所有访问器均返回副本，外部无法篡改内部状态。
 */
export class MetaphysicalClaim {
  private readonly 断言标识: string
  private readonly 形而上学范畴: MetaphysicalCategory
  private readonly 断言内容: string
  private readonly 原文依据: EvidenceAnchor
  private readonly 涉及主体们: string[]

  public constructor(snapshot: MetaphysicalClaimSnapshot) {
    let 校验值 = metaphysicalClaimSnapshotSchema.parse(snapshot)
    let 主体集合 = new Set<string>()
    for (let 主体 of 校验值.subjects) {
      if (主体集合.has(主体)) {
        throw new Error(`形而上学断言 ${校验值.id} 的涉及主体存在重复: ${主体}`)
      }
      主体集合.add(主体)
    }
    this.断言标识 = 校验值.id
    this.形而上学范畴 = 校验值.category
    this.断言内容 = 校验值.content
    this.原文依据 = { ...校验值.evidence }
    this.涉及主体们 = [...校验值.subjects]
  }

  public getId(): string {
    return this.断言标识
  }

  public getCategory(): MetaphysicalCategory {
    return this.形而上学范畴
  }

  public getContent(): string {
    return this.断言内容
  }

  public getEvidence(): EvidenceAnchor {
    return { ...this.原文依据 }
  }

  public getSubjects(): string[] {
    return [...this.涉及主体们]
  }

  /**
   * 断言内容、涉及主体或范畴中文标签的大小写不敏感子串匹配。
   * 空白关键词匹配一切断言。
   */
  public matchesKeyword(keyword: string): boolean {
    let 归一化关键词 = keyword.trim().toLowerCase()
    if (归一化关键词.length === 0) {
      return true
    }
    if (this.断言内容.toLowerCase().includes(归一化关键词)) {
      return true
    }
    if (getCategoryLabel(this.形而上学范畴).toLowerCase().includes(归一化关键词)) {
      return true
    }
    return this.涉及主体们.some((主体) => 主体.toLowerCase().includes(归一化关键词))
  }

  public toSnapshot(): MetaphysicalClaimSnapshot {
    return {
      id: this.断言标识,
      category: this.形而上学范畴,
      content: this.断言内容,
      evidence: { ...this.原文依据 },
      subjects: [...this.涉及主体们],
    }
  }
}
