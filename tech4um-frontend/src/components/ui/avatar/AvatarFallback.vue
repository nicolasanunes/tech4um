<script setup lang="ts">
import type { AvatarFallbackProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { computed, useSlots } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { AvatarFallback } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<AvatarFallbackProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
const slots = useSlots()

function hashString(value: string): number {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }

  return Math.abs(hash)
}

function extractTextFromNodes(nodes: unknown[]): string {
  return nodes
    .map((node) => {
      if (typeof node === "string") {
        return node
      }

      if (node && typeof node === "object" && "children" in node) {
        const children = (node as { children?: unknown }).children

        if (typeof children === "string") {
          return children
        }

        if (Array.isArray(children)) {
          return extractTextFromNodes(children)
        }
      }

      return ""
    })
    .join("")
}

const fallbackText = computed(() => {
  const content = slots.default?.() ?? []
  return extractTextFromNodes(content).trim() || "avatar"
})

const fallbackColorStyle = computed(() => {
  const hash = hashString(fallbackText.value.toLowerCase())
  const hue = hash % 360
  const saturation = 55 + (hash % 30)
  const lightness = 38 + (hash % 14)

  return {
    backgroundColor: `hsl(${hue} ${saturation}% ${lightness}%)`,
    color: "#ffffff",
  }
})
</script>

<template>
  <AvatarFallback
    data-slot="avatar-fallback"
    v-bind="delegatedProps"
    :class="cn('flex size-full items-center justify-center rounded-full', props.class)"
    :style="fallbackColorStyle"
  >
    <slot />
  </AvatarFallback>
</template>
