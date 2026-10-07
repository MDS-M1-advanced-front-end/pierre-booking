<!--
  Choix d'une journée : champ date entouré des boutons jour précédent / suivant (maquette : écrans
  02 et 10, `.slot-picker__date`). La valeur est une date calendaire `YYYY-MM-DD`, sans fuseau.
  Le libellé est rendu ici, relié au champ par `id`.
-->
<script lang="ts">
  import { isBefore, isIsoDate, nextDay, previousDay } from '../utils/dateNavigation';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    /** Identifiant du champ date. */
    id: string;
    /** Libellé visible, ex. « Date » (écran 02) ou « Journée » (écran 10). */
    label: string;
    /** Jour choisi, `YYYY-MM-DD` (`bind:value`). */
    value: string;
    /** Premier jour autorisé, `YYYY-MM-DD` (ex. aujourd'hui avec `todayInParis()`). */
    min?: string;
    /** Appelé avec la nouvelle date valide, après chaque changement. */
    onchange?: (value: string) => void;
  }

  let { id, label, value = $bindable(), min, onchange }: Props = $props();

  // `aria-disabled` plutôt que `disabled` : le bouton garde le focus quand on atteint la borne.
  const canGoBack = $derived(isIsoDate(value) && !isBefore(previousDay(value), min));
  const canGoForward = $derived(isIsoDate(value));

  function select(date: string) {
    if (!isIsoDate(date) || isBefore(date, min) || date === value) return;
    value = date;
    onchange?.(date);
  }

  // Saisie dans le champ : une date incomplète (champ vidé) n'est pas propagée ; une date avant
  // `min` (saisie au clavier malgré l'attribut) est remplacée par la valeur courante.
  function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
    const date = event.currentTarget.value;
    if (isIsoDate(date) && isBefore(date, min)) event.currentTarget.value = value;
    else select(date);
  }
</script>

<div class="flex flex-col gap-(--space-1)">
  <label class="font-semibold" for={id}>{label}</label>
  <div class="flex items-center gap-(--space-2)">
    <Button
      variant="secondary"
      iconOnly
      aria-disabled={!canGoBack}
      onclick={() => {
        select(previousDay(value));
      }}
    >
      <Icon name="left" />
      <span class="visually-hidden">Jour précédent</span>
    </Button>
    <input
      {id}
      type="date"
      {value}
      {min}
      onchange={handleInput}
      class={[
        'min-h-(--size-control) w-full min-w-0 flex-1 rounded-md border border-border-strong bg-surface',
        'px-(--space-3) py-(--space-2) text-text hover:border-text-muted',
        'focus-visible:border-action focus-visible:outline-offset-0',
      ]}
    />
    <Button
      variant="secondary"
      iconOnly
      aria-disabled={!canGoForward}
      onclick={() => {
        select(nextDay(value));
      }}
    >
      <Icon name="right" />
      <span class="visually-hidden">Jour suivant</span>
    </Button>
  </div>
</div>
