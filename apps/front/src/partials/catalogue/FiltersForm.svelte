<!--
  Filtres du catalogue (maquette : écran 01, `.filters`). Rendu statique par `Filters.astro` (sans
  directive `client:*`) : c'est un formulaire `GET` qui fonctionne sans JavaScript.
  En mobile, replié dans un `<details>` ; en desktop (`lg:`), le résumé est masqué et le panneau
  toujours visible (`::details-content`), seulement si le navigateur connaît ce pseudo-élément :
  sinon le `<details>` reste utilisable comme en mobile.
-->
<script lang="ts">
  import Badge from '../../components/Badge.svelte';
  import Button from '../../components/Button.svelte';
  import Checkbox from '../../components/Checkbox.svelte';
  import Field from '../../components/Field.svelte';
  import Icon from '../../components/Icon.svelte';
  import Input from '../../components/Input.svelte';
  import Select from '../../components/Select.svelte';
  import type { CatalogueFilters } from './catalogueParams';

  interface Props {
    /** Filtres validés de l'URL (valeurs initiales des champs). */
    filters: CatalogueFilters;
    /** Lieux proposés, déduits des salles (anomalie 13). */
    locations: string[];
    /** Nombre de filtres renseignés. */
    activeCount: number;
  }

  let { filters, locations, activeCount }: Props = $props();

  // Un lieu venu de l'URL mais absent de la liste reste visible comme sélectionné.
  const locationOptions = $derived(
    filters.location && !locations.includes(filters.location)
      ? [filters.location, ...locations]
      : locations,
  );

  const subLabel = '[&>label]:text-sm';
</script>

<details
  class="group/filters supports-[selector(::details-content)]:lg:[&::details-content]:[content-visibility:visible]"
>
  <summary
    class={[
      'flex min-h-(--size-control) cursor-pointer list-none items-center justify-between px-(--space-4)',
      'rounded-md border border-border-strong bg-surface font-semibold [&::-webkit-details-marker]:hidden',
      'supports-[selector(::details-content)]:lg:hidden',
    ]}
  >
    <span class="flex flex-wrap items-center gap-(--space-2)">
      <Icon name="sliders" />
      Filtres
      {#if activeCount > 0}
        <Badge variant="neutral">{activeCount} {activeCount > 1 ? 'actifs' : 'actif'}</Badge>
      {/if}
    </span>
    <Icon name="down" class="transition-transform group-open/filters:rotate-180" />
  </summary>

  <form
    class="mt-(--space-2) rounded-lg border border-border bg-surface shadow-sm supports-[selector(::details-content)]:lg:mt-0"
    role="search"
    aria-label="Rechercher une salle"
    action="/"
    method="get"
    data-catalogue-filters
  >
    <div class="flex flex-col gap-(--space-4) p-(--space-4) md:p-(--space-5)">
      <Field label="Recherche" id="search">
        {#snippet children(attrs)}
          <div class="relative">
            <Icon
              name="search"
              class="pointer-events-none absolute top-1/2 left-(--space-3) -translate-y-1/2 text-text-muted"
            />
            <Input
              {...attrs}
              class="pl-[calc(var(--space-3)*2+1.25em)]"
              name="search"
              type="search"
              placeholder="Nom ou description"
              maxlength={255}
              value={filters.search ?? ''}
            />
          </div>
        {/snippet}
      </Field>

      <Field label="Lieu" id="location">
        {#snippet children(attrs)}
          <Select {...attrs} name="location" value={filters.location ?? ''}>
            <option value="">Tous les lieux</option>
            {#each locationOptions as location (location)}
              <option value={location}>{location}</option>
            {/each}
          </Select>
        {/snippet}
      </Field>

      <fieldset class="m-0 border-0 p-0">
        <legend class="mb-(--space-2) p-0 font-semibold">Capacité</legend>
        <div class="grid grid-cols-2 gap-(--space-4)">
          <Field label="Minimum" id="capacityMin" class={subLabel}>
            {#snippet children(attrs)}
              <Input
                {...attrs}
                name="capacityMin"
                type="number"
                min="1"
                max="10000"
                inputmode="numeric"
                value={filters.capacityMin ?? ''}
              />
            {/snippet}
          </Field>
          <Field label="Maximum" id="capacityMax" class={subLabel}>
            {#snippet children(attrs)}
              <Input
                {...attrs}
                name="capacityMax"
                type="number"
                min="1"
                max="10000"
                inputmode="numeric"
                value={filters.capacityMax ?? ''}
              />
            {/snippet}
          </Field>
        </div>
      </fieldset>

      <Field label="Date" id="date">
        {#snippet children(attrs)}
          <Input {...attrs} name="date" type="date" value={filters.date ?? ''} />
        {/snippet}
      </Field>

      <fieldset class="m-0 border-0 p-0">
        <legend class="mb-(--space-2) p-0 font-semibold">Créneau</legend>
        <div class="grid grid-cols-2 gap-(--space-4)">
          <Field label="De" id="startTime" class={subLabel}>
            {#snippet children(attrs)}
              <Input
                {...attrs}
                name="startTime"
                type="time"
                step="3600"
                value={filters.startTime ?? ''}
              />
            {/snippet}
          </Field>
          <Field label="À" id="endTime" class={subLabel}>
            {#snippet children(attrs)}
              <Input
                {...attrs}
                name="endTime"
                type="time"
                step="3600"
                value={filters.endTime ?? ''}
              />
            {/snippet}
          </Field>
        </div>
      </fieldset>

      <Checkbox name="available" value="true" checked={filters.available ?? false}>
        Uniquement les salles disponibles
      </Checkbox>

      <div class="flex flex-col gap-(--space-2)">
        <Button type="submit" block>Afficher les résultats</Button>
        <Button variant="ghost" href="/" block>Réinitialiser les filtres</Button>
      </div>
    </div>
  </form>
</details>
