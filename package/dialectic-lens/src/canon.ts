import { ChainDestination, ElenchusQuestionForm, ImplicitContentType } from './schema.js'

/**
 * 诘问链终点的类别。
 */
export type ChainDestinationKind = ChainDestination['kind']

/**
 * 全部隐含内容类型的固定枚举顺序，供覆盖统计与遍历使用。
 */
export let allImplicitContentTypes: readonly ImplicitContentType[] = [
  'hiddenPremise',
  'assumption',
  'unclearDefinition',
  'defaultCommonSense',
]

/**
 * 隐含内容类型到中文标签的映射。
 */
export let implicitContentTypeLabelMap: Record<ImplicitContentType, string> = {
  hiddenPremise: '隐藏前提',
  assumption: '假设',
  unclearDefinition: '模糊定义',
  defaultCommonSense: '默认常识',
}

/**
 * 全部诘问形式的固定枚举顺序。
 */
export let allElenchusQuestionForms: readonly ElenchusQuestionForm[] = [
  'definitionProbe',
  'premiseProbe',
  'clarificationProbe',
  'consistencyProbe',
  'counterexampleProbe',
  'ascentProbe',
]

/**
 * 诘问形式到中文标签的映射。
 */
export let elenchusQuestionFormLabelMap: Record<ElenchusQuestionForm, string> = {
  definitionProbe: '定义追问',
  premiseProbe: '前提追问',
  clarificationProbe: '澄清追问',
  consistencyProbe: '一致性追问',
  counterexampleProbe: '反例追问',
  ascentProbe: '上升追问',
}

/**
 * 全部终点类别的固定枚举顺序。
 */
export let allChainDestinationKinds: readonly ChainDestinationKind[] = ['ascent', 'aporia']

/**
 * 终点类别到中文标签的映射。
 */
export let chainDestinationKindLabelMap: Record<ChainDestinationKind, string> = { ascent: '上升', aporia: '困惑' }
