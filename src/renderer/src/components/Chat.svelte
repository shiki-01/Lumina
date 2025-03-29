<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte'
  import Lumina from './Lumina.svelte'
  import Icon from '@iconify/svelte'
  import SvelteMarkdown from 'svelte-markdown'
  import '../assets/scroll.css'
  import '../assets/markdown.scss'
  import { navigate } from 'svelte-routing'
  import type { MessageTable } from '../../../global'
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

<div class="width:100% height:100%">
  <div
    class="scroll width:100% max-height:100% overflow-y:auto display:flex flex-direction:column gap:24px padding-x:240px padding-y:64px"
  >
    {#if messages}
      {#each Object.entries(messages) as [_, message]}
        <div class="width:100% display:flex flex-direction:column gap:12px padding-bottom:120px">
          <div class="width:100% display:flex gap:12px">
            {message.user}
          </div>
          <span class="width:100% height:2px background:#eee"></span>
          <div class="width:100% display:flex gap:12px">
            <Lumina />
            <div class="markdown width:100% display:flex flex-direction:column">
              <SvelteMarkdown source={message.assistant} />
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
  <div
    class="width:calc(100%-48px) height:{areaHeight}px position:absolute bottom:12px left:0 margin:24px display:flex justify-content:center gap:12px"
  >
    <div
      class="width:740px height:calc({areaHeight}px+20px) filter:blur(15px) position:absolute z:0 top:50% left:50% transform:translate(-50%,-50%) bg:rgba(209,26,29,0.315) border-radius:26px overflow:hidden"
    >
      <div
        class="width:calc({areaHeight}px+800) square position:absolute top:-400px left:-20px gradient"
      ></div>
    </div>
    <div
      class="width:720px height:100% padding:16px position:relative display:flex flex-direction:column gap:4px border-radius:16px bg:#fff"
    >
      <textarea
        class="scroll width:100% min-height:56px outline:none:focus resize:none bg:#fff"
        oninput={calcAreaHeight}
        bind:this={textArea}
      ></textarea>
      <div class="width:100% height:36px"></div>
      <button
        class="send width:36px height:36px position:absolute bottom:12px right:12px display:flex overflow:hidden border-radius:50% bg:#06c8ef bg:#34ddff:active fg:#fff shadow:0|2px|10px|#06c8ef98 shadow:0|4px|16px|rgb(6,200,239):hover transition:box-shadow|120ms|ease-in cursor:pointer"
        onclick={send}
      >
        <div class="width:100% height:100% display:flex position:relative">
          {#each Array(gradients) as _, i}
            <div
              bind:this={elements[i]}
              class="element width:36px height:36px position:absolute top:0 left:0 z:0 border-radius:50%"
              style={`--element-x-${i}: ${random()}; --element-y-${i}: ${random()}; transform:translate(var(--element-x-${i}), var(--element-y-${i}));`}
            ></div>
          {/each}
          <div
            data-loading={loading}
            class="loading width:36px height:36px display:flex align-items:center justify-content:center position:relative"
          >
            <Icon
              class="position:absolute top:50% left:50% translate(-50%,-50%) z:1 width:20px height:20px"
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
