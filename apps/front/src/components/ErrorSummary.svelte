<!--
  Récapitulatif des erreurs d'un formulaire (maquette : ecrans/04-inscription.html ; cadrage.md § 2.6).

  Alerte « danger » focalisable (`tabindex="-1"`) listant les erreurs sous forme de liens
  « Libellé : message » vers le champ fautif (`#id`, celui donné au `Field`). Rien n'est rendu
  tant que la liste est vide.

  Le récapitulatif prend le focus quand la liste passe de vide à non vide (première soumission en
  erreur). Pour une soumission suivante alors qu'il est déjà affiché, l'écran appelle `focus()`
  (après `await tick()` si la liste vient de changer).

  Props :
    errors: { id: string; label: string; message: string }[]
    title?: string   défaut : « N erreur(s) empêche(nt) l'enregistrement »

  Exemple :
    <ErrorSummary bind:this={summary} errors={summaryErrors}
      title="2 erreurs empêchent la création du compte" />
    …
    await tick();
    summary?.focus();
-->
<script lang="ts" module>
  /** Une erreur du récapitulatif : `id` du champ, son libellé et le message. */
  export interface ErrorSummaryItem {
    id: string;
    label: string;
    message: string;
  }
</script>

<script lang="ts">
  import Alert from './Alert.svelte';

  interface Props {
    errors: ErrorSummaryItem[];
    title?: string;
  }

  let { errors, title }: Props = $props();

  let container = $state<HTMLDivElement>();

  const heading = $derived.by(() => {
    if (title) return title;
    const count = errors.length;
    return count > 1
      ? `${count} erreurs empêchent l'enregistrement`
      : `${count} erreur empêche l'enregistrement`;
  });

  /** Place le focus sur le récapitulatif (s'il est affiché). */
  export function focus(): void {
    container?.focus();
  }

  // Focus au passage de « aucune erreur » à « des erreurs » ; l'effet s'exécute après le rendu.
  let previousCount = 0;
  $effect(() => {
    const count = errors.length;
    if (previousCount === 0 && count > 0) container?.focus();
    previousCount = count;
  });

  /** Va au champ : focus et défilement, sans dépendre du comportement des ancres sur un `<input>`. */
  function goToField(event: MouseEvent, id: string): void {
    const field = document.getElementById(id);
    if (!field) return;
    event.preventDefault();
    field.focus();
    field.scrollIntoView?.({ block: 'center' });
  }
</script>

{#if errors.length > 0}
  <div bind:this={container} tabindex="-1" class="rounded-md">
    <Alert variant="danger" title={heading}>
      <ul class="mt-(--space-1) list-disc pl-(--space-4)">
        {#each errors as error (error.id)}
          <li>
            <a href={`#${error.id}`} onclick={(event) => goToField(event, error.id)}>
              {error.label} : {error.message}
            </a>
          </li>
        {/each}
      </ul>
    </Alert>
  </div>
{/if}
