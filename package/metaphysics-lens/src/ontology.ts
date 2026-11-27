import { MetaphysicalCategory } from './schema.js'

/**
 * 形而上学论题域：把十九个形而上学范畴归并到的八个传统论题领域。
 */
export type MetaphysicalDomain =
  | 'entity'
  | 'essenceExistence'
  | 'causality'
  | 'universals'
  | 'modality'
  | 'timeChange'
  | 'identity'
  | 'unityMultiplicity'

/**
 * 全部形而上学范畴的固定枚举顺序，供覆盖统计与遍历使用。
 */
export let allMetaphysicalCategories: readonly MetaphysicalCategory[] = [
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
]

/**
 * 范畴到中文标签的映射。
 */
export let categoryLabelMap: Record<MetaphysicalCategory, string> = {
  substance: '实体',
  accident: '偶性',
  essence: '本质',
  existence: '存在',
  materialCause: '质料因',
  formalCause: '形式因',
  efficientCause: '动力因',
  finalCause: '目的因',
  universal: '共相',
  particular: '殊相',
  potentiality: '潜能',
  actuality: '现实',
  necessity: '必然',
  contingency: '偶然',
  time: '时间',
  change: '变化',
  identity: '同一性',
  unity: '一',
  multiplicity: '多',
}

/**
 * 范畴到论题域的归属映射。
 */
export let categoryDomainMap: Record<MetaphysicalCategory, MetaphysicalDomain> = {
  substance: 'entity',
  accident: 'entity',
  essence: 'essenceExistence',
  existence: 'essenceExistence',
  materialCause: 'causality',
  formalCause: 'causality',
  efficientCause: 'causality',
  finalCause: 'causality',
  universal: 'universals',
  particular: 'universals',
  potentiality: 'modality',
  actuality: 'modality',
  necessity: 'modality',
  contingency: 'modality',
  time: 'timeChange',
  change: 'timeChange',
  identity: 'identity',
  unity: 'unityMultiplicity',
  multiplicity: 'unityMultiplicity',
}

/**
 * 论题域到中文标签的映射。
 */
export let domainLabelMap: Record<MetaphysicalDomain, string> = {
  entity: '实体论',
  essenceExistence: '本质与存在',
  causality: '因果论',
  universals: '共相问题',
  modality: '模态',
  timeChange: '时间与变化',
  identity: '同一性',
  unityMultiplicity: '一与多',
}

/**
 * 形而上学张力对：同一主体同时被两种相互对峙的范畴断言时，构成传统形而上学中的经典张力。
 * - 必然 ↔ 偶然：模态冲突。
 * - 潜能 ↔ 现实：尚未实现与已经实现的对峙。
 * - 共相 ↔ 殊相：普遍者与个别者的对峙。
 * - 一 ↔ 多：统一性与复多性的对峙。
 * - 变化 ↔ 同一性：流变与持存的对峙。
 */
export let tensionPairList: readonly (readonly [MetaphysicalCategory, MetaphysicalCategory])[] = [
  ['necessity', 'contingency'],
  ['potentiality', 'actuality'],
  ['universal', 'particular'],
  ['unity', 'multiplicity'],
  ['change', 'identity'],
]

/**
 * 返回范畴的中文标签。
 */
export function getCategoryLabel(category: MetaphysicalCategory): string {
  return categoryLabelMap[category]
}

/**
 * 返回范畴所属的论题域。
 */
export function getCategoryDomain(category: MetaphysicalCategory): MetaphysicalDomain {
  return categoryDomainMap[category]
}

/**
 * 返回论题域的中文标签。
 */
export function getDomainLabel(domain: MetaphysicalDomain): string {
  return domainLabelMap[domain]
}

/**
 * 返回张力对的可读标签，例如 "必然 ↔ 偶然"。
 */
export function describeTensionPair(pair: readonly [MetaphysicalCategory, MetaphysicalCategory]): string {
  return `${getCategoryLabel(pair[0])} ↔ ${getCategoryLabel(pair[1])}`
}
