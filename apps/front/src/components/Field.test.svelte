<!-- Montage de test : un Field avec un Input, comme dans un écran (voir Field.test.ts). -->
<script lang="ts">
  import { fieldValidationMessage } from '../utils/validationMessage';
  import Field from './Field.svelte';
  import Input from './Input.svelte';

  interface Props {
    error?: string | null;
    hint?: string;
    suffix?: string;
  }

  let { error: initialError = null, hint, suffix }: Props = $props();

  // svelte-ignore state_referenced_locally
  let error = $state(initialError);
  let value = $state('');
</script>

<Field label="Adresse e-mail" id="email" required {hint} {suffix} {error}>
  {#snippet children(attrs)}
    <Input
      {...attrs}
      type="email"
      required
      bind:value
      onblur={(event) => {
        error = fieldValidationMessage(event.currentTarget, { subject: "L'adresse e-mail" });
      }}
    />
  {/snippet}
</Field>
<output data-testid="value">{value}</output>
