import {
  allMetaphysicalCategories,
  describeTensionPair,
  getCategoryDomain,
  getCategoryLabel,
  getDomainLabel,
  MetaphysicalDomain,
  tensionPairList,
} from '../ontology.js'
import {
  ExtractionProvenance,
  MetaphysicalCategory,
  MetaphysicsDocumentSnapshot,
  metaphysicsDocumentSnapshotSchema,
} from '../schema.js'
import { MetaphysicalClaim } from './claim.js'

/**
 * 范畴覆盖剖面中单个范畴的统计条目。
 */
export type CategoryCoverageEntry = {
  category: MetaphysicalCategory
  categoryLabel: string
  domain: MetaphysicalDomain
  domainLabel: string
  claimCount: number
}

/**
 * 多范畴主体：被两种及以上不同形而上学范畴断言涉及的主体。
 */
export type MultiCategorySubject = { subject: string; categories: MetaphysicalCategory[]; claimCount: number }

/**
 * 一条形而上学张力：同一主体同时被某对相互对峙的范畴断言。
 */
export type MetaphysicalTension = {
  subject: string
  pair: readonly [MetaphysicalCategory, MetaphysicalCategory]
  pairLabel: string
  claimIds: string[]
}

/**
 * 形而上学篇章是一次形而上学剖析的完整结果。
 * 聚合了发言原文、全部形而上学断言、来源标签、记录时间与提取来源（模型与提示词版本），
 * 并在构造时重新校验每条原文依据与原文逐字一致、断言标识全局唯一。
 * 对外提供范畴覆盖剖面、主体索引、多范畴主体检索与同一主体上的形而上学张力诊断；
 * 快照恢复后的篇章与新建篇章满足完全相同的不变量。
 */
export class MetaphysicsDocument {
  private readonly 篇章标识: string
  private readonly 原文: string
  private readonly 断言列表: MetaphysicalClaim[]
  private readonly 范畴计数表: Map<MetaphysicalCategory, number>
  private readonly 主体索引: Map<string, MetaphysicalClaim[]>
  private readonly 来源标签: string | null
  private readonly 记录时间: number
  private readonly 提取来源: ExtractionProvenance

  public constructor(snapshot: MetaphysicsDocumentSnapshot) {
    let 校验值 = metaphysicsDocumentSnapshotSchema.parse(snapshot)

    for (let 断言 of 校验值.claims) {
      let 依据 = 断言.evidence
      if (依据.end > 校验值.text.length) {
        throw new Error(`Evidence anchor for claim ${断言.id} exceeds the document text length`)
      }
      if (校验值.text.slice(依据.start, 依据.end) !== 依据.quote) {
        throw new Error(`Evidence anchor for claim ${断言.id} does not match the document text`)
      }
    }

    let 断言列表 = 校验值.claims.map((断言) => new MetaphysicalClaim(断言))

    let 标识集合 = new Set<string>()
    for (let 断言 of 断言列表) {
      if (标识集合.has(断言.getId())) {
        throw new Error(`Duplicate claim id in document: ${断言.getId()}`)
      }
      标识集合.add(断言.getId())
    }

    let 范畴计数表 = new Map<MetaphysicalCategory, number>()
    for (let 范畴 of allMetaphysicalCategories) {
      范畴计数表.set(范畴, 0)
    }
    let 主体索引 = new Map<string, MetaphysicalClaim[]>()
    for (let 断言 of 断言列表) {
      let 范畴 = 断言.getCategory()
      范畴计数表.set(范畴, (范畴计数表.get(范畴) ?? 0) + 1)
      for (let 主体 of 断言.getSubjects()) {
        let 既有 = 主体索引.get(主体)
        if (既有 === undefined) {
          主体索引.set(主体, [断言])
        } else {
          既有.push(断言)
        }
      }
    }

    this.篇章标识 = 校验值.id
    this.原文 = 校验值.text
    this.断言列表 = 断言列表
    this.范畴计数表 = 范畴计数表
    this.主体索引 = 主体索引
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

  public getClaims(): MetaphysicalClaim[] {
    return [...this.断言列表]
  }

  public getClaimById(id: string): MetaphysicalClaim | undefined {
    return this.断言列表.find((断言) => 断言.getId() === id)
  }

  /**
   * 返回全部十九个范畴的覆盖剖面，计数为零的范畴也在列，按固定范畴顺序排列。
   */
  public getCategoryCoverage(): CategoryCoverageEntry[] {
    return allMetaphysicalCategories.map((范畴) => ({
      category: 范畴,
      categoryLabel: getCategoryLabel(范畴),
      domain: getCategoryDomain(范畴),
      domainLabel: getDomainLabel(getCategoryDomain(范畴)),
      claimCount: this.范畴计数表.get(范畴) ?? 0,
    }))
  }

  /**
   * 列出全部涉及主体，按字典序排序。
   */
  public listSubjects(): string[] {
    return [...this.主体索引.keys()].sort((甲, 乙) => 甲.localeCompare(乙))
  }

  /**
   * 返回涉及某主体的全部断言；主体按表面形式精确匹配。
   */
  public getClaimsBySubject(subject: string): MetaphysicalClaim[] {
    return [...(this.主体索引.get(subject) ?? [])]
  }

  /**
   * 找出被两种及以上不同范畴断言涉及的主体，即发言中“厚重”的形而上学对象。
   */
  public findMultiCategorySubjects(): MultiCategorySubject[] {
    let 结果: MultiCategorySubject[] = []
    for (let [主体, 断言们] of this.主体索引) {
      let 范畴集合 = new Set<MetaphysicalCategory>()
      for (let 断言 of 断言们) {
        范畴集合.add(断言.getCategory())
      }
      if (范畴集合.size >= 2) {
        结果.push({ subject: 主体, categories: [...范畴集合], claimCount: 断言们.length })
      }
    }
    return 结果.sort((甲, 乙) => 甲.subject.localeCompare(乙.subject))
  }

  /**
   * 诊断同一主体上的形而上学张力：某主体同时被某对对峙范畴（如必然与偶然）断言时报告一条张力。
   * 张力只描述发言中显式呈现的范畴对峙，不断言发言本身存在逻辑谬误。
   */
  public findTensions(): MetaphysicalTension[] {
    let 结果: MetaphysicalTension[] = []
    for (let [主体, 断言们] of this.主体索引) {
      let 范畴到断言标识 = new Map<MetaphysicalCategory, string[]>()
      for (let 断言 of 断言们) {
        let 范畴 = 断言.getCategory()
        let 既有 = 范畴到断言标识.get(范畴)
        if (既有 === undefined) {
          范畴到断言标识.set(范畴, [断言.getId()])
        } else {
          既有.push(断言.getId())
        }
      }
      for (let 张力对 of tensionPairList) {
        let 左极断言 = 范畴到断言标识.get(张力对[0])
        let 右极断言 = 范畴到断言标识.get(张力对[1])
        if (左极断言 !== undefined && 右极断言 !== undefined) {
          结果.push({
            subject: 主体,
            pair: 张力对,
            pairLabel: describeTensionPair(张力对),
            claimIds: [...左极断言, ...右极断言],
          })
        }
      }
    }
    return 结果.sort((甲, 乙) => 甲.subject.localeCompare(乙.subject))
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

  public toSnapshot(): MetaphysicsDocumentSnapshot {
    return {
      snapshotVersion: 1,
      id: this.篇章标识,
      text: this.原文,
      claims: this.断言列表.map((断言) => 断言.toSnapshot()),
      sourceLabel: this.来源标签,
      recordedAt: this.记录时间,
      provenance: { ...this.提取来源 },
    }
  }
}
