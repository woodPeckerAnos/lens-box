import OpenAI from 'openai'
import { 联想语料, 联想透镜 } from '../src/index.js'

async function 运行模型演示(): Promise<void> {
  let 客户端 = new OpenAI({ apiKey: 'ollama', baseURL: 'http://127.0.0.1:11434/v1' })

  let 透镜 = new 联想透镜({
    openai客户端: 客户端,
    模型名称: 'gpt-oss-20b',
    是否支持函数调用: true,
    最大校验重试次数: 6,
    回调: async (事件): Promise<void> => {
      switch (事件.类型) {
        case '错误':
          console.error('[模型错误]', 事件.错误信息)
          break
        case '校验失败':
          console.warn(`[校验失败 ${事件.当前次数}/${事件.最大次数}]`, 事件.错误信息)
          break
        case '工具调用失败':
          console.error(`[工具调用失败 ${事件.工具名称}]`, 事件.错误信息)
          break
        case '流程信息':
          console.log('[流程信息]', 事件.内容)
          break
        case '原始AI返回':
          console.log('[原始AI返回]', {
            模型请求序号: 事件.模型请求序号,
            完整文本: 事件.完整文本,
            工具调用数量: 事件.工具调用列表.length,
          })
          break
        case '模型响应完成':
          console.log('[模型响应完成]', { 状态: 事件.状态, 工具调用数量: 事件.工具调用数量 })
          break
        case 'AI文本片段':
        case '工具调用参数片段':
        case '工具调用开始':
        case '工具调用结果':
        case '最终结果':
        case '原始请求配置':
        case '模型请求审计':
          break
      }
    },
  })

  let 篇章 = await 透镜.观察({
    文本: [
      '深夜窗外的雨点像急促敲来的电码，我忽然想起抽屉里那封始终没有寄出的信。',
      '信封角落的邮票已经卷边，淡蓝色的海岸线图案像极了那年我们在灯塔下告别时的潮汐。',
      '桌上的旧怀表还在一下一下走着，齿轮咬合的轻响仿佛把海风和雨声都缝进了同一段停不下来的时间里。',
    ].join('\n'),
    上下文提示: '第一人称抒情散文片段，存在跨感官与跨意象的多步联想',
    来源标签: '本地羊驼演示',
  })

  let 网络 = 篇章.获得关系网络()
  console.log('=== 联想关系网络 ===')
  console.log(JSON.stringify(网络, null, 2))

  let 首节点 = 网络.节点[0]
  if (首节点 !== undefined) {
    let 出边关系 = 篇章.查询关系({ 源节点: 首节点.节点标识 })
    let 联想链 = 篇章.获得联想链({ 起始节点: 首节点.节点标识, 最大深度: 6, 最大链数: 20 })
    console.log(`=== 从节点 [${首节点.节点标识}] 出发的关系 ===`)
    console.log(
      JSON.stringify(
        出边关系.map((关系) => 关系.导出快照()),
        null,
        2,
      ),
    )
    console.log(`=== 从节点 [${首节点.节点标识}] 出发的联想链 ===`)
    console.log(JSON.stringify(联想链, null, 2))
  }

  let 语料 = new 联想语料([篇章])
  console.log('=== 连接方式统计 ===')
  console.log(JSON.stringify(语料.统计连接方式(), null, 2))
  console.log('=== 领域转移统计 ===')
  console.log(JSON.stringify(语料.统计领域转移(), null, 2))
}

void 运行模型演示()
