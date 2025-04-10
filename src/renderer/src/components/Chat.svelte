<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte'
  import Lumina from './Lumina.svelte'
  import Icon from '@iconify/svelte'
  import SvelteMarkdown from 'svelte-markdown'
  import '../assets/scroll.css'
  import '../assets/markdown.scss'
  import { navigate } from 'svelte-routing'
  import type { MessageTable } from '../../../global.js'
  import type { ChatResponse } from 'ollama'

  const gradients = 3

  let params: { id: string } = $props()
  let messages: Record<string, MessageTable> = $state({})
  let loading = $state(false)
  let textArea: HTMLTextAreaElement | null = $state(null)
  let areaHeight = $state(0)
  let elements: HTMLDivElement[] = $state(JSON.parse(JSON.stringify(Array(gradients).fill(null))))
  let interval

  const random = (): number => Math.floor(Math.random() * (10 - -10 + 1) + -10)

  const update = (): void => {
    elements.forEach((element, i) => {
      if (element) {
        element.style.setProperty('--element-x-' + i, `${random()}%`)
        element.style.setProperty('--element-y-' + i, `${random()}%`)
      }
    })
  }

  const applyClipboard = (): void => {
    const markdown = window.document.querySelector('.markdown')
    if (markdown) {
      const pres = markdown.querySelectorAll('pre')
      pres.forEach((pre) => {
        const clipboard = pre.querySelector('.clipboard')
        if (clipboard) {
          clipboard.addEventListener('click', () => {
            const code = pre.querySelector('code')
            if (code) {
              navigator.clipboard.writeText(code.innerText)
              ;(clipboard as HTMLElement).dataset.clipboardSuccess = 'true'
              setTimeout(() => {
                ;(clipboard as HTMLElement).dataset.clipboardSuccess = 'false'
              }, 2000)
            }
          })
        }
      })
    }
  }

  const send = async (): Promise<void> => {
    let inputText = textArea?.value
    if (!inputText || loading) return
    loading = true

    const stream = await window.api.listeners.stream.onResponse((chunks) => {
      const chunk = chunks[0] as {
        data: ChatResponse
        messageId: string
        chatId: string
      }
      if (chunk && 'data' in chunk && 'messageId' in chunk) {
        const { data, messageId, chatId } = chunk
        if (!messages[messageId]) {
          messages[messageId] = {
            id: messageId,
            chat_id: params.id,
            user: inputText || '',
            assistant: '',
            created_at: new Date().toISOString()
          }
        }
        if (data && 'message' in data) {
          const { content } = data.message
          messages[messageId].assistant += content

          applyClipboard()

          if (params.id === 'tmp' && chatId) {
            navigate(`/chat/${chatId}`)
          }
        }
      } else if ('error' in chunk) {
        console.error('Error:')
      } else {
        console.log('Unknown chunk:', chunk)
      }
    })

    try {
      await window.api.invoke.ollama.generate(params.id, inputText)
      if (stream && stream.data) {
        stream.data()
      }
    } catch (error) {
      console.error('生成エラー:', error)
    } finally {
      loading = false
      if (textArea) {
        textArea.value = ''
        inputText = ''
      }
    }
  }

  const calcAreaHeight = (): void => {
    if (textArea) {
      areaHeight = Math.min(Math.abs(Math.max(textArea.scrollHeight, 56) + 120 - 56), 180)
    }
  }

  onMount(async () => {
    interval = setInterval(update, 500)
    calcAreaHeight()

    if (typeof window !== 'undefined' && params.id !== 'tmp') {
      const { data } = await window.api.invoke.messages.getHistory(params.id)
      if (data) {
        messages = data.reduce(
          (acc, message) => {
            acc[message.id] = message
            return acc
          },
          {} as Record<string, MessageTable>
        )

        await tick()
        applyClipboard()
      }
    }
  })

  onDestroy(() => {
    clearInterval(interval)
  })
</script>

<div class="w:100% h:100%">
  <div
    class="scroll w:100% max-h:100% overflow-y:auto flex rel flex:column gap:24px px:120px py:64px"
  >
    <div
      class="fixed px:120px py:24px top:0 left:0 w:100% h:100% z:10 flex flex:column justify-content:space-between pointer-events:none"
    >
      <span class="w:100% h:64px bg:#fff"></span>
      <span class="w:100% h:64px bg:linear-gradient(to|bottom,rgba(255,255,255,0),#fff|60%)"></span>
    </div>
    {#each Object.entries(messages) as [index, message] (index)}
      <div class="w:100% flex rel flex:column gap:12px pb:120px">
        <div
          class="w:100% sticky top:0 flex flex:column bg:linear-gradient(to|bottom,#fff|60%,rgba(255,255,255,0)) z:1"
        >
          {message.user}
          <span class="w:100% h:2px mt:24px mb:32px bg:#eee"></span>
        </div>
        <div class="w:100% flex gap:12px rel px:40px">
          <div class="abs top:0 left:0">
            <Lumina />
          </div>
          <div class="markdown w:100% px:12px pt:8px flex flex:column">
            <SvelteMarkdown source={message.assistant} />
          </div>
        </div>
      </div>
    {/each}
  </div>
  <div
    class="w:calc(100%-48px) h:{areaHeight}px abs z:50 bottom:12px left:0 m:24px flex justify-content:center gap:12px"
  >
    <div
      class="w:740px h:calc({areaHeight}px+20px) blur(15px) abs z:0 top:50% left:50% translate(-50%,-50%) bg:rgba(209,26,29,0.315) r:26px overflow:hidden"
    >
      <div class="w:calc({areaHeight}px+800) square abs top:-400px left:-20px gradient"></div>
    </div>
    <div class="w:720px h:100% padding:16px rel flex flex:column gap:4px r:16px bg:#fff">
      <textarea
        class="scroll w:100% min-h:56px outline:none:focus resize:none bg:#fff"
        oninput={calcAreaHeight}
        bind:this={textArea}
      ></textarea>
      <div class="w:100% h:36px"></div>
      <button
        class="send w:36px h:36px abs bottom:12px right:12px flex overflow:hidden r:50% bg:#06c8ef bg:#34ddff:active fg:#fff shadow:0|2px|10px|#06c8ef98 shadow:0|4px|16px|rgb(6,200,239):hover box-shadow|120ms|ease-in cursor:pointer"
        onclick={send}
      >
        <div class="w:100% h:100% flex rel">
          {#each Array(gradients) as _, index (index)}
            <div
              bind:this={elements[index]}
              class="element w:36px h:36px abs top:0 left:0 z:0 r:50% translate({random}%, {random}%)"
            ></div>
          {/each}
          <div
            data-loading={loading}
            class="loading w:36px h:36px flex align-items:center justify-content:center rel"
          >
            <Icon
              class="abs top:50% left:50% translate(-50%,-50%) z:1 w:20px h:20px"
              icon={loading ? 'mdi:loading' : 'mdi:send'}
            />
          </div>
        </div>
      </button>
    </div>
  </div>
</div>

<style>
  .element {
    transition: transform rotate 0.5s;
    animation: rotate 10s ease-in-out infinite;
  }

  .element:nth-child(1) {
    background-image: radial-gradient(at 20% 80%, hsla(181, 85%, 69%, 1) 0px, transparent 60%);
  }

  .element:nth-child(2) {
    background-image: radial-gradient(at 10% 40%, hsla(189, 95%, 48%, 1) 0px, transparent 60%);
  }

  .element:nth-child(3) {
    background-image: radial-gradient(at 80% 10%, hsla(185, 95%, 48%, 1) 0px, transparent 60%);
  }

  .gradient {
    background-color: hsla(202, 100%, 50%, 1);
    background-image:
      radial-gradient(at 40% 20%, hsla(212, 100%, 74%, 1) 0px, transparent 50%),
      radial-gradient(at 80% 0%, hsla(189, 100%, 56%, 1) 0px, transparent 50%),
      radial-gradient(at 17% 50%, hsla(212, 100%, 93%, 1) 0px, transparent 50%),
      radial-gradient(at 53% 67%, hsla(183, 100%, 76%, 1) 0px, transparent 50%),
      radial-gradient(at 0% 100%, hsla(225, 100%, 77%, 1) 0px, transparent 50%),
      radial-gradient(at 82% 86%, hsla(214, 100%, 70%, 1) 0px, transparent 50%),
      radial-gradient(at 0% 0%, hsla(197, 100%, 76%, 1) 0px, transparent 50%);
    animation: rotate 10s linear infinite;
  }

  .loading[data-loading='true'] {
    animation: rotate 1s ease-in-out infinite;
  }

  @keyframes rotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
