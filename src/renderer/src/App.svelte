<script lang="ts">
  import { onMount } from 'svelte'
  import { CSSRuntimeProvider } from '@master/css.svelte'
  import { Router, Route, Link, navigate } from 'svelte-routing'
  import Icon from '@iconify/svelte'
  import Chat from './components/Chat.svelte'
  import config from './master.css'
  import mocks from './assets/mock.json'
  import '@fontsource-variable/noto-sans-jp'
  import '@fontsource-variable/roboto'
  import './assets/scroll.css'

  let root: Document | ShadowRoot | null = $state(null)
  let isOverflow = $state(false)

  const styleVariable = {
    mainPadding: 24,
    headerHeight: 48
  }

  const newChat = async (): Promise<void> => {
    if (typeof window !== 'undefined') {
      const { data } = await window.api.invoke.chats.create('')
      console.log(data)
      if (data && data.id) {
        navigate(`/chat/${data.id}`)
      }
    }
  }

  $effect(() => {
    if (typeof document !== 'undefined') {
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = document.documentElement.clientHeight
      isOverflow = scrollHeight > clientHeight
    }
  })

  onMount(async () => {
    if (typeof window !== 'undefined') {
      root = document
    }
  })
</script>

<CSSRuntimeProvider {config} {root}>
  <div class="width:100svw height:100svh overflow:hidden">
    <Router>
      <div
        class={`width:100% height:100% overflow:hidden position:relative padding:${styleVariable.mainPadding}px`}
      >
        <Route path="/chat/:id" let:params>
          <Chat id={params.id} />
        </Route>
        <Route path="/">
          <button
            onclick={newChat}
            class="position:absolute bottom:0 right:0 margin:24px padding:12px border-radius:100px cursor:pointer fg:#fff bg:#000 shadow:0|2px|4px|rgba(0,0,0,0.2) shadow:0|4px|8px|rgba(0,0,0,0.2):hover ~box-shadow|ease-in ~duration:120ms"
          >
            <Icon icon="mdi:plus" class="width:24px height:24px" />
          </button>
          <div
            data-isOverflow={isOverflow}
            class="scroll width:100% height:100% flex flex:column overflow-y:auto gap:16px"
          >
            {#each mocks as mock}
              <Link to="/chat/{mock.id}">
                <div
                  class="margin:8px padding:16px border-radius:8px cursor:pointer shadow:0|2px|4px|rgba(0,0,0,0.2) shadow:0|4px|8px|rgba(0,0,0,0.2):hover ~box-shadow|ease-in ~duration:120ms"
                >
                  <h1 class="font-weight:400 font-size:1.5em">{mock.title}</h1>
                  <div class="flex flex:row justify-content:space-between">
                    <p>{mock.date}</p>
                    <p>{mock.model}</p>
                  </div>
                </div>
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
