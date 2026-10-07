<!--
  Écran 08 « Mes salles » (maquette : ecrans/08-gestion-salles.html ; cadrage.md § 4 « 08 »).
  Liste des salles du gestionnaire connecté dans un tableau qui s'empile en mobile (chaque ligne
  devient une carte, l'en-tête de colonne est porté par `data-label`), avec les actions
  Disponibilités, Modifier et Supprimer (après confirmation dans une modale).

  - Données : `listRoomsOfOwner(userId)` (pas de filtre `ownerId` dans le contrat : anomalie 5).
  - Statut en lecture seule : `status` est absent des requêtes de salle (anomalie 6).
  - `?saved=1` (retour du formulaire 09) : confirmation « La salle a été enregistrée. », puis le
    paramètre est retiré de l'adresse.

  Props :
    userId: string   identifiant du gestionnaire connecté (fourni par `RequireAuth`)
-->
<script lang="ts">
  import type { Room } from '@room-booking/core';
  import { onMount, tick } from 'svelte';
  import Alert from '../../components/Alert.svelte';
  import Badge from '../../components/Badge.svelte';
  import Button from '../../components/Button.svelte';
  import EmptyState from '../../components/EmptyState.svelte';
  import ErrorState from '../../components/ErrorState.svelte';
  import Icon from '../../components/Icon.svelte';
  import Modal from '../../components/Modal.svelte';
  import Skeleton from '../../components/Skeleton.svelte';
  import { errorMessage } from '../../data/errors';
  import { deleteRoom, listRoomsOfOwner } from '../../data/rooms/rooms.queries';
  import { theRoom } from './roomTitle';

  interface Props {
    userId: string;
  }

  let { userId }: Props = $props();

  type LoadState =
    { type: 'loading' } | { type: 'error'; message: string } | { type: 'ready'; rooms: Room[] };

  let load = $state<LoadState>({ type: 'loading' });
  /** Message de confirmation (enregistrement ou suppression). */
  let success = $state<string | null>(null);
  let successRegion = $state<HTMLDivElement>();

  /** Salle dont la suppression est demandée (modale ouverte tant qu'elle est renseignée). */
  let toDelete = $state<Room | null>(null);
  let deleteOpen = $state(false);
  let deleting = $state(false);
  let deleteError = $state<string | null>(null);

  // Tarif avec centimes, comme la maquette : « 45,00 € / h ».
  const priceFormat = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  async function fetchRooms() {
    load = { type: 'loading' };
    const result = await listRoomsOfOwner(userId);
    load = result.ok
      ? { type: 'ready', rooms: result.data }
      : { type: 'error', message: errorMessage(result.error) };
  }

  onMount(() => {
    const url = new URL(location.href);
    if (url.searchParams.get('saved') === '1') {
      success = 'La salle a été enregistrée.';
      url.searchParams.delete('saved');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
    void fetchRooms();
  });

  function askDelete(room: Room) {
    toDelete = room;
    deleteError = null;
    deleteOpen = true;
  }

  async function confirmDelete() {
    if (!toDelete || deleting) return;
    const room = toDelete;
    deleting = true;
    deleteError = null;
    const result = await deleteRoom(room.id);
    deleting = false;
    if (!result.ok) {
      deleteError = errorMessage(result.error, {
        404: "Cette salle n'existe plus.",
        409: 'Cette salle a des réservations en cours : elle ne peut pas être supprimée.',
      });
      return;
    }
    // Fermer d'abord : la modale rend le focus au bouton « Supprimer », encore présent.
    deleteOpen = false;
    if (load.type === 'ready') {
      load = { type: 'ready', rooms: load.rooms.filter((item) => item.id !== room.id) };
    }
    success = 'La salle a été supprimée.';
    // Le bouton qui avait le focus a disparu avec la ligne : on le place sur la confirmation.
    await tick();
    successRegion?.focus();
  }

  const count = $derived(load.type === 'ready' ? load.rooms.length : 0);

  // Tableau qui s'empile en mobile (maquette.css, .table et .table--stack).
  const cell = [
    'border-t border-border px-(--space-4) py-(--space-3) text-left align-middle',
    'max-md:flex max-md:justify-between max-md:gap-(--space-4) max-md:border-0 max-md:px-0 max-md:py-(--space-1)',
  ];
  const labelled =
    'max-md:text-right max-md:before:text-left max-md:before:font-regular max-md:before:text-text-muted max-md:before:content-[attr(data-label)]';
  const numeric = 'md:text-right tabular-nums';
  const headCell =
    'border-t border-border bg-bg px-(--space-4) py-(--space-3) text-left font-semibold whitespace-nowrap text-text-muted';
</script>

<div class="mb-(--space-5) flex flex-wrap items-end justify-between gap-(--space-4)">
  <div>
    <h1>Mes salles</h1>
    {#if count > 0}
      <p class="mt-(--space-1) text-text-muted">
        {count}
        {count > 1 ? 'salles' : 'salle'} dont vous êtes gestionnaire.
      </p>
    {/if}
  </div>
  <Button href="/gestion/salles/nouvelle">
    <Icon name="plus" />
    Ajouter une salle
  </Button>
</div>

{#if success}
  <div bind:this={successRegion} tabindex="-1" class="mb-(--space-5) rounded-md">
    <Alert variant="success">{success}</Alert>
  </div>
{/if}

{#if load.type === 'loading'}
  <div class="flex flex-col gap-(--space-3)" aria-busy="true">
    <p class="visually-hidden" role="status">Chargement des salles…</p>
    {#each [0, 1, 2] as row (row)}
      <div
        class="flex items-center gap-(--space-3) rounded-lg border border-border bg-surface p-(--space-4)"
      >
        <Skeleton class="h-9 w-12" />
        <div class="flex flex-1 flex-col gap-(--space-2)">
          <Skeleton class="w-2/5" />
          <Skeleton class="w-1/4" />
        </div>
      </div>
    {/each}
  </div>
{:else if load.type === 'error'}
  <ErrorState
    title="Vos salles n'ont pas pu être chargées"
    message={load.message}
    headingLevel={2}
    onretry={fetchRooms}
  />
{:else if load.rooms.length === 0}
  <EmptyState
    title="Vous n'avez pas encore de salle"
    text="Ajoutez votre première salle pour la proposer à la réservation dans le catalogue."
    icon="building"
    headingLevel={2}
  >
    {#snippet action()}
      <Button href="/gestion/salles/nouvelle">
        <Icon name="plus" />
        Ajouter une salle
      </Button>
    {/snippet}
  </EmptyState>
{:else}
  <div class="overflow-hidden rounded-lg border border-border bg-surface">
    <table class="w-full border-collapse text-sm">
      <caption class="visually-hidden">Mes salles</caption>
      <thead class="max-md:visually-hidden">
        <tr>
          <th scope="col" class={headCell}>Salle</th>
          <th scope="col" class={[headCell, 'text-right']}>Capacité</th>
          <th scope="col" class={[headCell, 'text-right']}>Tarif</th>
          <th scope="col" class={headCell}>Statut</th>
          <th scope="col" class={headCell}><span class="visually-hidden">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {#each load.rooms as room (room.id)}
          <tr
            class="max-md:block max-md:border-t max-md:border-border max-md:px-(--space-4) max-md:py-(--space-3) max-md:first:border-t-0"
          >
            <th scope="row" class={[cell, 'max-md:pb-(--space-2)']}>
              <span class="flex items-center gap-(--space-3)">
                {#if room.imageUrl}
                  <img
                    class="h-9 w-12 flex-none rounded-sm object-cover"
                    src={room.imageUrl}
                    alt=""
                    loading="lazy"
                  />
                {:else}
                  <span
                    class={[
                      'grid h-9 w-12 flex-none place-items-center rounded-sm bg-action-subtle text-action',
                      'bg-[linear-gradient(135deg,transparent_48%,var(--palette-teal-100)_48%,var(--palette-teal-100)_52%,transparent_52%)]',
                    ]}
                    aria-hidden="true"
                  >
                    <Icon
                      name="building"
                      class="size-6 rounded-full bg-surface p-(--space-1) stroke-[1.5]"
                    />
                  </span>
                {/if}
                <span>
                  <a href={`/salles/${room.id}`}>{room.name}</a><br />
                  <span class="text-text-muted">{room.location}</span>
                </span>
              </span>
            </th>
            <td class={[cell, labelled, numeric]} data-label="Capacité">{room.capacity} pers.</td>
            <td class={[cell, labelled, numeric]} data-label="Tarif">
              {priceFormat.format(room.pricePerHour)} / h
            </td>
            <td class={[cell, labelled]} data-label="Statut">
              {#if room.status === 'ACTIVE'}
                <Badge variant="confirmed">Active</Badge>
              {:else}
                <Badge variant="neutral">Inactive</Badge>
              {/if}
            </td>
            <td
              class={[
                cell,
                'whitespace-nowrap md:text-right max-md:justify-end max-md:pt-(--space-2)',
              ]}
            >
              <span class="flex flex-wrap items-center justify-end gap-(--space-2)">
                <Button
                  variant="secondary"
                  size="sm"
                  href={`/gestion/salles/${room.id}/disponibilites`}
                >
                  <Icon name="calendar" />
                  Disponibilités
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  href={`/gestion/salles/${room.id}/modifier`}
                >
                  <Icon name="pencil" />
                  <span class="visually-hidden">Modifier {room.name}</span>
                </Button>
                <Button variant="ghost" size="sm" iconOnly onclick={() => askDelete(room)}>
                  <Icon name="trash" />
                  <span class="visually-hidden">Supprimer {room.name}</span>
                </Button>
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<Modal
  bind:open={deleteOpen}
  title={toDelete ? `Supprimer ${theRoom(toDelete.name)} ?` : 'Supprimer la salle ?'}
  onclose={() => {
    toDelete = null;
    deleteError = null;
  }}
>
  <p>La salle disparaîtra du catalogue. Cette action est définitive.</p>
  {#if deleteError}
    <Alert variant="danger">{deleteError}</Alert>
  {/if}
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (deleteOpen = false)}>Conserver</Button>
    <Button variant="danger" aria-busy={deleting} onclick={confirmDelete}>
      Supprimer la salle
    </Button>
  {/snippet}
</Modal>
