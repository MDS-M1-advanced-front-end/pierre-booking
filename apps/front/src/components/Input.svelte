<!--
  Zone de saisie (maquette : `.input`). Hauteur `--size-control`, bordure `--color-border-strong`
  (contraste 3:1), états survol, focus, invalide (`aria-invalid="true"`) et désactivé.
  S'utilise dans un `Field`, qui lui fournit `id`, `aria-describedby` et `aria-invalid` :
    <Input {...attrs} type="email" required bind:value={email} />
  Tous les attributs HTML restants sont transmis à l'`<input>`.
-->
<script lang="ts" module>
  /** Classes communes à `Input`, `Select` et `Textarea` (maquette : `.input, .select, .textarea`),
   * sans hauteur minimale ni coins arrondis, propres à chaque contrôle. */
  export const controlClasses = [
    'w-full min-w-0 px-(--space-3) py-(--space-2)',
    'border border-border-strong bg-surface text-text [font:inherit]',
    'not-aria-invalid:hover:border-text-muted',
    'focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-focus focus-visible:outline-offset-0',
    'not-aria-invalid:focus-visible:border-action',
    'aria-invalid:border-2 aria-invalid:border-danger',
    'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted',
  ].join(' ');
</script>

<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { getFieldContext } from './Field.svelte';

  interface Props extends Omit<HTMLInputAttributes, 'value' | 'class'> {
    value?: HTMLInputAttributes['value'];
    class?: string;
  }

  let { value = $bindable(), class: className, ...rest }: Props = $props();

  const field = getFieldContext();
</script>

<input
  bind:value
  class={[
    'input',
    controlClasses,
    'min-h-(--size-control)',
    field?.hasSuffix ? 'rounded-l-md rounded-r-none' : 'rounded-md',
    className,
  ]}
  {...rest}
/>
