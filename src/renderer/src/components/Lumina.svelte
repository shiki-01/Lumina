<script lang="ts">
  import { onMount } from 'svelte'
  import lumina from '../assets/lumina.svg?raw'
  import DOMPurify from 'dompurify'

  let eye = $state(true)
  let modifiedLumina = $state(lumina)

  const updateEyeDisplay = (display: boolean): void => {
    modifiedLumina = DOMPurify.sanitize(
      lumina
        .replace(
          /id="eye_open"\s*style\s*=\s*["']\s*display\s*:\s*(inline|none)([^"']*)["']/g,
          `id="eye_open" style="display:${display ? 'inline' : 'none'}$2"`
        )
        .replace(
          /id="eye_close"\s*style\s*=\s*["']\s*display\s*:\s*(inline|none)([^"']*)["']/g,
          `id="eye_close" style="display:${display ? 'none' : 'inline'}$2"`
        )
    )
  }

  const startBlinking = (): void => {
    const blink = (remainingBlinks: number): void => {
      if (remainingBlinks <= 0) {
        const nextBlinkInterval = Math.random() * 5000 + 3000
        setTimeout(() => {
          const blinkCount = Math.floor(Math.random() * 2) + 2
          blink(blinkCount)
        }, nextBlinkInterval)
        return
      }

      eye = false
      updateEyeDisplay(eye)

      setTimeout(
        () => {
          eye = true
          updateEyeDisplay(eye)

          setTimeout(
            () => {
              blink(remainingBlinks - 1)
            },
            Math.random() * 200 + 100
          )
        },
        Math.random() * 200 + 100
      )
    }

    const initialBlinkCount = Math.floor(Math.random() * 2) + 2
    blink(initialBlinkCount)
  }

  onMount(() => {
    startBlinking()
  })

  $effect(() => {
    updateEyeDisplay(eye)
  })
</script>

<div class="lumina-svg width:48px height:48px display:flex padding-top:1rem">
  <!-- eslint-disable-next-line -->
  {@html modifiedLumina}
</div>

<style>
  .lumina-svg {
    transition: display 0.3s ease-in-out;
  }

  .lumina-svg :global(svg) {
    width: 100%;
    height: 100%;
  }
</style>
