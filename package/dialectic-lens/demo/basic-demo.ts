import OpenAI from 'openai'
import {
  DialecticDocument,
  DialecticLens,
  elenchusQuestionFormLabelMap,
  implicitContentTypeLabelMap,
} from '../src/index.js'

// 默认连接本地 Ollama 的 gpt-oss 模型
let 模型配置 = {
  apiKey: 'ollama',
  baseURL: 'http://127.0.0.1:11434/v1',
  模型名称: 'gpt-oss-20b',
  是否支持函数调用: true,
}

function 渲染项标签(篇章: DialecticDocument, 内容标识: string): string {
  let 项 = 篇章.getItem(内容标识)
  if (项 === undefined) {
    return 内容标识
  }
  return `${implicitContentTypeLabelMap[项.getType()]}「${项.getConcept()}」`
}

async function 运行辩证剖析演示(): Promise<void> {
  if (模型配置.apiKey.trim().length === 0 || 模型配置.模型名称.trim().length === 0) {
    throw new Error('请先在 demo/basic-demo.ts 中填写模型配置（apiKey、baseURL、模型名称）后再运行')
  }

  let 客户端 = new OpenAI({
    apiKey: 模型配置.apiKey,
    ...(模型配置.baseURL.trim().length > 0 ? { baseURL: 模型配置.baseURL } : {}),
  })

  let 透镜 = new DialecticLens({
    openaiClient: 客户端,
    model: 模型配置.模型名称,
    supportsFunctionCalling: 模型配置.是否支持函数调用,
  })

  let 发言 = [
    '有债照还就是正义。',
    '借了钱按时归还，不亏欠任何人，这就是一个人该守的本分。',
    '再说，这样的做法大家都看在眼里，人人都会拍手称快，说这才是对的。',
  ].join('\n')

  let 篇章 = await 透镜.analyze({ text: 发言, sourceLabel: '手动演示' })

  console.log('=== 隐含内容 ===')
  for (let 项 of 篇章.getItems()) {
    console.log(`[${implicitContentTypeLabelMap[项.getType()]}] ${项.getConcept()}：${项.getContent()}`)
    console.log(`    依据: "${项.getEvidence().quote}"`)
  }

  console.log('\n=== 诘问链 ===')
  for (let 链 of 篇章.getChains()) {
    console.log(`概念「${链.getConcept()}」`)
    console.log(
      `  起点: ${链
        .getTargetItemIds()
        .map((标识) => 渲染项标签(篇章, 标识))
        .join('、')}`,
    )
    let 终点 = 链.getDestination()
    switch (终点.kind) {
      case 'ascent':
        console.log(`  终点（上升）: ${终点.idea}`)
        console.log(`  本质定义尝试: ${终点.essentialDefinition}`)
        break
      case 'aporia':
        console.log(`  终点（困惑）: ${终点.note}`)
        break
    }
    for (let 步骤 of 链.getMoves()) {
      console.log(`  [${elenchusQuestionFormLabelMap[步骤.form]}] ${步骤.question}`)
      console.log(
        `      质疑: ${步骤.aim}（锚定: ${步骤.targetItemIds.map((标识) => 渲染项标签(篇章, 标识)).join('、')}）`,
      )
    }
  }

  console.log('\n=== 结构诊断 ===')
  console.log({
    未被追问的隐含内容: 篇章.findUnprobedItems().map((项) => 项.getContent()),
    终点剖面: 篇章.getDestinationProfile(),
  })
}

void 运行辩证剖析演示()
