import { ChainDestination, ElenchusChainSnapshot, elenchusChainSnapshotSchema, ElenchusMove } from '../schema.js'

/**
 * An ElenchusChain is a candidate Socratic questioning analysis orbiting one concept. It is a
 * guided path between two fixed endpoints: its start (the implicit content items it challenges)
 * and its destination (an ascent to the speaker's underlying conception, or an honest aporia)
 * are both determined when the chain is designed; the moves are only the realization of the line
 * between them.
 *
 * A chain is an analysis result, not a behavior to execute: whether and when to actually ask any
 * of its questions is up to the caller. Every move is anchored to the items it is responsible to
 * and to nothing else — no move depends on the answer to a previous question — so the questioning
 * cannot drift when the speaker's answers deviate from any expectation.
 *
 * Construction enforces the chain invariants: unique start ids, unique anchors per move and every
 * move anchored within the chain start. All accessors return copies.
 */
export class ElenchusChain {
  private readonly 链标识: string
  private readonly 环绕概念: string
  private readonly 起点内容标识列表: string[]
  private readonly 终点: ChainDestination
  private readonly 引导步骤列表: ElenchusMove[]

  public constructor(snapshot: ElenchusChainSnapshot) {
    let 校验值 = elenchusChainSnapshotSchema.parse(snapshot)

    let 起点集合 = new Set<string>()
    for (let 内容标识 of 校验值.targetItemIds) {
      if (起点集合.has(内容标识)) {
        throw new Error(`Duplicate target item id in elenchus chain start: ${内容标识}`)
      }
      起点集合.add(内容标识)
    }

    for (let [步骤序号, 步骤] of 校验值.moves.entries()) {
      let 步骤锚定集合 = new Set<string>()
      for (let 内容标识 of 步骤.targetItemIds) {
        if (步骤锚定集合.has(内容标识)) {
          throw new Error(`Duplicate anchored item id in move ${String(步骤序号 + 1)} of elenchus chain: ${内容标识}`)
        }
        步骤锚定集合.add(内容标识)
        if (起点集合.has(内容标识) === false) {
          throw new Error(
            `Move ${String(步骤序号 + 1)} of elenchus chain anchors to item "${内容标识}" outside the chain start`,
          )
        }
      }
    }

    this.链标识 = 校验值.id
    this.环绕概念 = 校验值.concept
    this.起点内容标识列表 = [...校验值.targetItemIds]
    this.终点 = { ...校验值.destination }
    this.引导步骤列表 = 校验值.moves.map((步骤) => ({ ...步骤, targetItemIds: [...步骤.targetItemIds] }))
  }

  public getId(): string {
    return this.链标识
  }

  public getConcept(): string {
    return this.环绕概念
  }

  /**
   * The fixed start of the chain: ids of the implicit content items it challenges.
   */
  public getTargetItemIds(): string[] {
    return [...this.起点内容标识列表]
  }

  /**
   * The fixed destination of the chain, determined when the chain was designed.
   */
  public getDestination(): ChainDestination {
    return { ...this.终点 }
  }

  /**
   * Returns the ascent payload when the destination is an ascent; returns null for an aporia.
   */
  public getAscent(): { idea: string; essentialDefinition: string } | null {
    switch (this.终点.kind) {
      case 'aporia':
        return null
      case 'ascent':
        return { idea: this.终点.idea, essentialDefinition: this.终点.essentialDefinition }
    }
  }

  /**
   * The guiding questions realizing the line between start and destination, in presentational order.
   */
  public getMoves(): ElenchusMove[] {
    return this.引导步骤列表.map((步骤) => ({ ...步骤, targetItemIds: [...步骤.targetItemIds] }))
  }

  /**
   * Returns the moves anchored to the given implicit content item.
   */
  public getMovesTargeting(itemId: string): ElenchusMove[] {
    return this.引导步骤列表
      .filter((步骤) => 步骤.targetItemIds.includes(itemId))
      .map((步骤) => ({ ...步骤, targetItemIds: [...步骤.targetItemIds] }))
  }

  public toSnapshot(): ElenchusChainSnapshot {
    return {
      id: this.链标识,
      concept: this.环绕概念,
      targetItemIds: [...this.起点内容标识列表],
      destination: { ...this.终点 },
      moves: this.引导步骤列表.map((步骤) => ({ ...步骤, targetItemIds: [...步骤.targetItemIds] })),
    }
  }
}
