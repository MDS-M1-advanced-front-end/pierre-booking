<!--
  Case à cocher avec son libellé cliquable (maquette : `.check`). Toute la ligne est cliquable
  et mesure au moins `--size-target-min` (24 px, WCAG 2.5.8).
    <Checkbox name="equipment" value="Wi-Fi" bind:checked={wifi}>Wi-Fi</Checkbox>
  Les attributs HTML restants sont transmis à l'`<input type="checkbox">`.
  Pour une liste (équipements), placer les cases dans un `<fieldset>` avec une `<legend>`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLInputAttributes, 'type' | 'checked' | 'class' | 'children'> {
    checked?: boolean;
    /** Classes du `<label>` englobant. */
    class?: string;
    /** Libellé de la case. */
    children: Snippet;
  }

  let { checked = $bindable(false), class: className, children, ...rest }: Props = $props();
</script>

<label
  class={[
    'check flex min-h-(--size-target-min) cursor-pointer items-center gap-(--space-2)',
    'has-disabled:cursor-not-allowed has-disabled:text-text-muted',
    className,
  ]}
>
  <input
    type="checkbox"
    bind:checked
    class="m-0 size-5 flex-none accent-action focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(--focus-ring-offset) focus-visible:outline-focus"
    {...rest}
  />
  {@render children()}
</label>
