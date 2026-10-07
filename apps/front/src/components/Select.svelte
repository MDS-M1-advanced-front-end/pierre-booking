<!--
  Liste déroulante native (maquette : `.select`), mêmes styles que `Input`.
  S'utilise dans un `Field` :
    <Select {...attrs} bind:value={location}>
      <option value="">Tous les lieux</option>
      …
    </Select>
  Tous les attributs HTML restants sont transmis au `<select>`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import { controlClasses } from './Input.svelte';

  interface Props extends Omit<HTMLSelectAttributes, 'value' | 'class' | 'children'> {
    value?: HTMLSelectAttributes['value'];
    class?: string;
    /** Les `<option>` (et `<optgroup>`). */
    children?: Snippet;
  }

  let { value = $bindable(), class: className, children, ...rest }: Props = $props();
</script>

<select
  bind:value
  class={['select', controlClasses, 'min-h-(--size-control) rounded-md', className]}
  {...rest}
>
  {@render children?.()}
</select>
