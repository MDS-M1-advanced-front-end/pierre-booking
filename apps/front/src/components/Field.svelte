<!--
  Champ de formulaire : libellé, astérisque « obligatoire », aide, suffixe et message d'erreur
  (maquette : composants.html § Input, ecrans/04-inscription.html, 09-salle-formulaire.html).

  Le contrôle est fourni par l'écran dans le snippet `children`, qui reçoit les attributs
  d'accessibilité à étaler dessus : `id`, `aria-describedby` (aide, suffixe, erreur) et
  `aria-invalid="true"` quand `error` est renseigné.

  Props :
    label: string            libellé visible (toujours affiché)
    id?: string              id du contrôle (sinon généré) ; à fixer pour les liens du récapitulatif
    required?: boolean       affiche « * » (aria-hidden) ; mettre aussi `required` sur le contrôle
    hint?: string            texte d'aide sous le contrôle
    error?: string | null    message d'erreur ; le champ passe en état invalide
    suffix?: string          unité accolée au contrôle (« pers. », « € / h »)
    class?: string           classes du conteneur
    children: Snippet<[FieldControlAttributes]>

  Exemple (formulaire en `novalidate`, messages calculés par `fieldValidationMessage`) :

    <script lang="ts">
      import { fieldValidationMessage } from '../utils/validationMessage';
      const capacityRules = { subject: 'La capacité', unit: ['personne', 'personnes'] } as const;
      let capacity = $state(1);
      let capacityError = $state<string | null>(null);
    </script>

    <Field label="Capacité" required suffix="pers." error={capacityError}>
      {#snippet children(attrs)}
        <Input
          {...attrs}
          type="number" min="1" required inputmode="numeric"
          bind:value={capacity}
          onblur={(e) => {
            // À la sortie du champ, on ne réévalue qu'un champ déjà en erreur.
            if (capacityError) capacityError = fieldValidationMessage(e.currentTarget, capacityRules);
          }}
        />
      {/snippet}
    </Field>

  À la soumission : si `!form.checkValidity()`, calculer le message de chaque champ avec
  `fieldValidationMessage(form.elements.namedItem('…'), …)`, puis focaliser le récapitulatif.
-->
<script lang="ts" module>
  import { getContext, setContext } from 'svelte';

  /** Attributs à étaler sur le contrôle (`<Input {...attrs} />`). */
  export interface FieldControlAttributes {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: 'true';
  }

  const fieldContextKey = Symbol('field');

  interface FieldContext {
    /** Vrai si le contrôle est suivi d'un suffixe (coins droits carrés). */
    readonly hasSuffix: boolean;
  }

  /** Lu par `Input` : savoir s'il est accolé à un suffixe. */
  export function getFieldContext(): FieldContext | undefined {
    return getContext<FieldContext | undefined>(fieldContextKey);
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  interface Props {
    label: string;
    id?: string;
    required?: boolean;
    hint?: string;
    error?: string | null;
    suffix?: string;
    class?: string;
    children: Snippet<[FieldControlAttributes]>;
  }

  const generatedId = $props.id();

  let {
    label,
    id = generatedId,
    required = false,
    hint,
    error,
    suffix,
    class: className,
    children,
  }: Props = $props();

  const hintId = $derived(`${id}-hint`);
  const suffixId = $derived(`${id}-suffix`);
  const errorId = $derived(`${id}-error`);

  const attrs = $derived.by((): FieldControlAttributes => {
    const describedBy = [hint && hintId, suffix && suffixId, error && errorId].filter(Boolean);
    return {
      id,
      ...(describedBy.length > 0 && { 'aria-describedby': describedBy.join(' ') }),
      ...(error && { 'aria-invalid': 'true' }),
    };
  });

  setContext<FieldContext>(fieldContextKey, {
    get hasSuffix() {
      return Boolean(suffix);
    },
  });
</script>

<div class={['flex flex-col gap-(--space-1)', className]}>
  <label class="font-semibold" for={id}>
    {label}
    {#if required}
      <span class="field__required text-danger-text" aria-hidden="true">*</span>
    {/if}
  </label>

  {#if suffix}
    <div class="input-suffix flex items-stretch">
      {@render children(attrs)}
      <span
        id={suffixId}
        class="grid place-items-center rounded-r-md border-y border-r border-border-strong bg-surface-muted px-(--space-3) whitespace-nowrap text-text-muted"
      >
        {suffix}
      </span>
    </div>
  {:else}
    {@render children(attrs)}
  {/if}

  {#if hint}
    <p id={hintId} class="text-sm text-text-muted">{hint}</p>
  {/if}

  {#if error}
    <p id={errorId} class="flex items-start gap-(--space-1) text-sm font-semibold text-danger-text">
      <Icon name="alert" class="mt-[0.1em]" />
      {error}
    </p>
  {/if}
</div>
