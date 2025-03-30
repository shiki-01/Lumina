<script lang="ts">
  import { onMount } from 'svelte'
  import { Router, Route, Link, navigate } from 'svelte-routing'
  import type { ChatTable } from '../../global.js'
  import { CSSRuntimeProvider } from '@master/css.svelte'
  import Icon from '@iconify/svelte'
  import Chat from './components/Chat.svelte'
  import '@fontsource-variable/noto-sans-jp'
  import '@fontsource-variable/roboto'
  import '@fontsource-variable/source-code-pro'
  import './assets/scroll.css'
  import ContextMenu from './components/ContextMenu.svelte'

  let isOverflow = $state(false)
  let contextMenu: { title: string; icon: string; action: () => void }[] = $state([])
  let contextPosition = $state({ x: 0, y: 0 })
  let isContextMenuOpen = $state(false)
  let chats: ChatTable[] = $state([])

  const updateChatList = async (): Promise<void> => {
    if (typeof window !== 'undefined') {
      const { data } = await window.api.invoke.chats.list()
      if (data) {
        chats = data
      }
    }
  }

  const newChat = async (): Promise<void> => {
    navigate(`/chat/tmp`)
  }

  const ListContextMenu = (event: MouseEvent, id: string): void => {
    event.preventDefault()
    event.stopPropagation()
    isContextMenuOpen = true
    contextPosition.x = event.clientX
    contextPosition.y = event.clientY
    contextMenu = [
      {
        title: 'New Chat',
        icon: 'mdi:plus',
        action: (): void => {
          newChat()
        }
      },
      {
        title: 'Delete Chat',
        icon: 'mdi:delete',
        action: (): void => {
          if (typeof window !== 'undefined') {
            window.api.invoke.chats.delete(id)
            chats = chats.filter((chat) => chat.id !== id)
          }
        }
      },
      {
        title: 'Export Chat',
        icon: 'mdi:export',
        action: (): void => {
          console.log('Export Chat')
        }
      },
      {
        title: 'Import Chat',
        icon: 'mdi:import',
        action: (): void => {
          console.log('Import Chat')
        }
      }
    ]
  }

  $effect(() => {
    if (typeof window !== 'undefined') {
      const scrollHeight = window.document.documentElement.scrollHeight
      const clientHeight = window.document.documentElement.clientHeight
      isOverflow = scrollHeight > clientHeight
    }
  })

  onMount(async () => {
    if (typeof window !== 'undefined') {
      await updateChatList()

      await window.api.listeners.stream.onDatabaseChange((event) => {
        if (event && event.name === 'chat') {
          updateChatList()
        }
      })
    }
  })
</script>

<CSSRuntimeProvider config>
  <div class="w:100svw h:100svh overflow:hidden">
    <Router>
      <div class="w:100% h:100% overflow:hidden rel p:24px">
        <Route path="/chat/:id" let:params>
          <Chat id={params.id} />
        </Route>
        <Route path="/">
          {#if isContextMenuOpen}
            <button
              class="abs top:0 right:0 w:100% h:100%"
              onclick={(): boolean => (isContextMenuOpen = false)}
            >
              <ContextMenu context={contextMenu} position={contextPosition} />
            </button>
          {/if}
          <button
            onclick={newChat}
            class="abs bottom:0 right:0 m:24px p:12px r:100px cursor:pointer fg:#fff bg:#000 shadow:0|2px|4px|rgba(0,0,0,0.2) shadow:0|4px|8px|rgba(0,0,0,0.2):hover ~box-shadow|ease-in ~duration:120ms"
          >
            <Icon icon="mdi:plus" class="w:24px h:24px" />
          </button>
          <div
            data-isOverflow={isOverflow}
            class="scroll w:100% h:100% flex flex:column overflow-y:auto gap:16px"
          >
            {#each chats as chat, index (index)}
              <Link to="/chat/{chat.id}">
                <button
                  oncontextmenu={(e): void => ListContextMenu(e, chat.id)}
                  class="w:calc(100%-16px) m:8px p:16px flex flex:column gap:8px r:8px cursor:pointer border:2px|solid|#06c8ef49 border:2px|solid|#06c8ef:hover ~border|ease-in ~duration:120ms"
                >
                  <h1 class="font-weight:400 font-size:1.5em text:left">タイトル{chat.title}</h1>
                  <div class="w:100% flex flex:row justify-content:space-between">
                    <p>{chat.created_at}</p>
                    <p>{chat.model}</p>
                  </div>
                </button>
              </Link>
            {/each}
          </div>
        </Route>
      </div>
    </Router>
  </div>
</CSSRuntimeProvider>

<style>
  .scroll {
    padding-right: 0px;
  }

  .scroll[data-isOverflow='true'] {
    padding-right: 8px;
  }
</style>
