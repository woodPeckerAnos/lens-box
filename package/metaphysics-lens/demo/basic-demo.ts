import OpenAI from 'openai'
import { getCategoryLabel, MetaphysicsLens } from '../src/index.js'

// 默认连接本地 Ollama 的 gpt-oss 模型
let 模型配置 = {
  apiKey: 'ollama',
  baseURL: 'http://127.0.0.1:11434/v1',
  模型名称: 'gpt-oss-20b',
  是否支持函数调用: true,
}

async function 运行形而上学剖析演示(): Promise<void> {
  if (模型配置.apiKey.trim().length === 0 || 模型配置.模型名称.trim().length === 0) {
    throw new Error('请先在 demo/basic-demo.ts 中填写模型配置（apiKey、baseURL、模型名称）后再运行')
  }

  let 客户端 = new OpenAI({
    apiKey: 模型配置.apiKey,
    ...(模型配置.baseURL.trim().length > 0 ? { baseURL: 模型配置.baseURL } : {}),
  })

  let 透镜 = new MetaphysicsLens({
    openaiClient: 客户端,
    model: 模型配置.模型名称,
    supportsFunctionCalling: 模型配置.是否支持函数调用,
  })

  let 发言 = [
    '苏格拉底是会死的，因为他是一个有血有肉的人。',
    '人的本质在于理性，正是理性使人成其为人。',
    '这座雕像是大理石构成的，它的形状来自雕刻家的构思。',
    '种子能够成为参天大树，而眼前的这棵树已经枝繁叶茂。',
    '水必然在零度结冰，但明天的天气却未必晴朗。',
  ].join('\n')

  let 篇章 = await 透镜.analyze({ text: 发言, sourceLabel: '手动演示' })

  console.log('=== 形而上学断言 ===')
  for (let 断言 of 篇章.getClaims()) {
    console.log(`[${getCategoryLabel(断言.getCategory())}] ${断言.getContent()}`)
    console.log(`    主体: ${断言.getSubjects().join('、')}`)
    console.log(`    依据: "${断言.getEvidence().quote}"`)
  }

  console.log('\n=== 范畴覆盖剖面 ===')
  for (let 条目 of 篇章.getCategoryCoverage()) {
    if (条目.claimCount > 0) {
      console.log(`${条目.domainLabel} / ${条目.categoryLabel}: ${String(条目.claimCount)} 条`)
    }
  }

  console.log('\n=== 多范畴主体 ===')
  for (let 主体 of 篇章.findMultiCategorySubjects()) {
    console.log(`${主体.subject}: ${主体.categories.map((范畴) => getCategoryLabel(范畴)).join('、')}`)
  }

  console.log('\n=== 形而上学张力 ===')
  for (let 张力 of 篇章.findTensions()) {
    console.log(`${张力.subject}: ${张力.pairLabel}`)
  }
}

void 运行形而上学剖析演示()
