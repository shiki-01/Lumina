<script lang="ts">
  import Icon from '@iconify/svelte'

  let {
    context,
    position
  }: {
    context: { title: string; icon: string; action: () => void }[]
    position: { x: number; y: number }
  } = $props()
</script>

<div>
  <div
    class="position:absolute background:#fff padding:4px shadow:0|0|2px|rgba(0,0,0,0.2) border-radius:4px display:flex flex-direction:column gap:4px"
    style="top: {position.y}px; left: {position.x}px; z-index: 1000"
  >
    {#each context as item, index (index)}
      {#if index !== 0}
        <span class="height:1px background:#f0f0f0"></span>
      {/if}
      <button
        class="padding:8px cursor:pointer display:flex align-items:center gap:8px border-radius:4px bg:#fff bg:#f0f0f0:hover fg:#000"
        onclick={item.action}
      >
        <Icon icon={item.icon} width="16" height="16" />
        <span class="margin-left:4px">{item.title}</span>
      </button>
    {/each}
  </div>
</div>

<style>
</style>
