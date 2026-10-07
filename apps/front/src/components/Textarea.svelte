<!--
  Zone de texte sur plusieurs lignes (maquette : `.textarea`), mêmes styles que `Input`,
  hauteur minimale 6rem, redimensionnable verticalement.
  S'utilise dans un `Field` :
    <Textarea {...attrs} rows={3} bind:value={description} />
  Tous les attributs HTML restants sont transmis au `<textarea>`.
-->
<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { controlClasses } from './Input.svelte';

  interface Props extends Omit<HTMLTextareaAttributes, 'value' | 'class'> {
    value?: HTMLTextareaAttributes['value'];
    class?: string;
  }

  let { value = $bindable(), class: className, ...rest }: Props = $props();
</script>

<textarea
  bind:value
  class={['textarea', controlClasses, 'min-h-[6rem] resize-y rounded-md', className]}
  {...rest}></textarea>
