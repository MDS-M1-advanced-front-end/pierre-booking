<!--
  Administration : gestion des utilisateurs (`/admin/utilisateurs`).
  Liste paginée, filtrable par rôle (`?role=`, `?page=` : adresse partageable), avec pour chaque
  compte le changement de rôle, ses réservations et la suppression (après confirmation).

  - Données : `listUsers` (GraphQL `users`), une requête par page.
  - Actions : `changeUserRole` dès que le rôle choisi change, `deleteUser` après la modale. Le
    compte connecté n'a ni l'un ni l'autre : le back les refuserait (409).

  Props :
    currentUserId: string   administrateur connecté (fourni par `RequireAuth`)
-->
<script lang="ts">
  import type { AdminUserFieldsFragment, UserRole } from '@room-booking/core/graphql';
  import { onMount, tick } from 'svelte';
  import Alert from '../../components/Alert.svelte';
  import Badge from '../../components/Badge.svelte';
  import Button from '../../components/Button.svelte';
  import EmptyState from '../../components/EmptyState.svelte';
  import ErrorState from '../../components/ErrorState.svelte';
  import Icon from '../../components/Icon.svelte';
  import Modal from '../../components/Modal.svelte';
  import Pagination from '../../components/Pagination.svelte';
  import SegmentedNav from '../../components/SegmentedNav.svelte';
  import Select from '../../components/Select.svelte';
  import Skeleton from '../../components/Skeleton.svelte';
  import { changeUserRole, deleteUser, listUsers } from '../../data/admin/admin.queries';
  import { errorMessage } from '../../data/errors';
  import { formatShortDate } from '../../utils/dates';
  import {
    ADMIN_PAGE_SIZE,
    fullName,
    listHref,
    parsePage,
    parseRole,
    ROLE_LABELS,
    ROLES,
  } from './admin';
  import * as t from './table';

  interface Props {
    currentUserId: string;
  }

  let { currentUserId }: Props = $props();

  const PATH = '/admin/utilisateurs';

  type LoadState =
    | { type: 'loading' }
    | { type: 'error'; message: string }
    | { type: 'ready'; users: AdminUserFieldsFragment[]; total: number };

  let load = $state<LoadState>({ type: 'loading' });
  let role = $state<UserRole | null>(null);
  let page = $state(1);

  let feedback = $state<{ variant: 'success' | 'danger'; message: string } | null>(null);
  let feedbackRegion = $state<HTMLDivElement>();
  /** Utilisateur dont le rôle est en cours d'enregistrement. */
  let savingId = $state<string | null>(null);

  let toDelete = $state<AdminUserFieldsFragment | null>(null);
  let deleteOpen = $state(false);
  let deleting = $state(false);
  let deleteError = $state<string | null>(null);

  async function fetchUsers() {
    load = { type: 'loading' };
    const result = await listUsers({ role, page, pageSize: ADMIN_PAGE_SIZE });
    load = result.ok
      ? { type: 'ready', users: result.data.users.items, total: result.data.users.total }
      : { type: 'error', message: errorMessage(result.error) };
  }

  onMount(() => {
    const params = new URL(location.href).searchParams;
    role = parseRole(params.get('role'));
    page = parsePage(params.get('page'));
    void fetchUsers();
  });

  const navItems = $derived([
    { label: 'Tous', href: listHref(PATH, {}), current: role === null },
    ...ROLES.map((value) => ({
      label: `${ROLE_LABELS[value]}s`,
      href: listHref(PATH, { role: value }),
      current: role === value,
    })),
  ]);

  async function showFeedback(variant: 'success' | 'danger', message: string) {
    feedback = { variant, message };
    await tick();
    feedbackRegion?.focus();
  }

  function replaceUser(updated: AdminUserFieldsFragment) {
    if (load.type !== 'ready') return;
    load = { ...load, users: load.users.map((u) => (u.id === updated.id ? updated : u)) };
  }

  async function updateRole(user: AdminUserFieldsFragment, select: HTMLSelectElement) {
    const next = select.value as UserRole;
    if (next === user.role || savingId) return;
    savingId = user.id;
    feedback = null;
    const result = await changeUserRole(user.id, next);
    savingId = null;
    if (!result.ok) {
      // Le menu revient au rôle enregistré
      select.value = user.role;
      await showFeedback(
        'danger',
        errorMessage(result.error, {
          404: "Ce compte n'existe plus.",
          409: 'Vous ne pouvez pas changer votre propre rôle.',
        }),
      );
      return;
    }
    replaceUser(result.data.changeUserRole);
    await showFeedback(
      'success',
      `${fullName(user)} est maintenant ${ROLE_LABELS[next].toLowerCase()}.`,
    );
  }

  function askDelete(user: AdminUserFieldsFragment) {
    toDelete = user;
    deleteError = null;
    deleteOpen = true;
  }

  async function confirmDelete() {
    if (!toDelete || deleting) return;
    const user = toDelete;
    deleting = true;
    deleteError = null;
    const result = await deleteUser(user.id);
    deleting = false;
    if (!result.ok) {
      deleteError = errorMessage(result.error, {
        404: "Ce compte n'existe plus.",
        409: 'Ce compte a des réservations, ou ses salles en ont : il ne peut pas être supprimé.',
      });
      return;
    }
    deleteOpen = false;
    if (load.type === 'ready') {
      load = {
        type: 'ready',
        users: load.users.filter((u) => u.id !== user.id),
        total: load.total - 1,
      };
    }
    await showFeedback('success', `Le compte de ${fullName(user)} a été supprimé.`);
  }
</script>

<SegmentedNav label="Filtrer par rôle" items={navItems} class="mb-(--space-5)" />

{#if feedback}
  <div bind:this={feedbackRegion} tabindex="-1" class="mb-(--space-5) rounded-md">
    <Alert variant={feedback.variant}><p>{feedback.message}</p></Alert>
  </div>
{/if}

{#if load.type === 'loading'}
  <div class="flex flex-col gap-(--space-3)" aria-busy="true">
    <p class="visually-hidden" role="status">Chargement des utilisateurs…</p>
    {#each [0, 1, 2, 3] as line (line)}
      <Skeleton class="h-14! w-full rounded-lg!" />
    {/each}
  </div>
{:else if load.type === 'error'}
  <ErrorState
    title="Les utilisateurs n'ont pas pu être chargés"
    message={load.message}
    headingLevel={2}
    onretry={fetchUsers}
  />
{:else if load.users.length === 0}
  <EmptyState
    title="Aucun utilisateur"
    text={role ? `Aucun compte avec le rôle « ${ROLE_LABELS[role]} ».` : undefined}
    icon="users"
    headingLevel={2}
  />
{:else}
  <p class="mb-(--space-3) text-text-muted" role="status">
    {load.total}
    {load.total > 1 ? 'comptes' : 'compte'}
  </p>
  <div class={t.tableFrame}>
    <table class={t.tableClass}>
      <caption class="visually-hidden">Utilisateurs</caption>
      <thead class={t.headClass}>
        <tr>
          <th scope="col" class={t.headCell}>Utilisateur</th>
          <th scope="col" class={t.headCell}>Rôle</th>
          <th scope="col" class={t.headCell}>Inscription</th>
          <th scope="col" class={t.headCell}><span class="visually-hidden">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {#each load.users as user (user.id)}
          {@const self = user.id === currentUserId}
          <tr class={t.row}>
            <th scope="row" class={[t.cell, 'font-regular max-md:pb-(--space-2)']}>
              <span>
                <span class="font-semibold">{fullName(user)}</span>
                {#if self}<Badge variant="neutral">Vous</Badge>{/if}<br />
                <span class="text-text-muted">{user.email}</span>
              </span>
            </th>
            <td class={[t.cell, t.labelled]} data-label="Rôle">
              {#if self}
                {ROLE_LABELS[user.role]}
              {:else}
                <Select
                  class="w-auto min-w-40"
                  aria-label={`Rôle de ${fullName(user)}`}
                  value={user.role}
                  aria-busy={savingId === user.id}
                  disabled={savingId !== null}
                  onchange={(event) => {
                    void updateRole(user, event.currentTarget);
                  }}
                >
                  {#each ROLES as value (value)}
                    <option {value}>{ROLE_LABELS[value]}</option>
                  {/each}
                </Select>
              {/if}
            </td>
            <td class={[t.cell, t.labelled, 'tabular-nums']} data-label="Inscription">
              {formatShortDate(user.createdAt)}
            </td>
            <td class={[t.cell, t.actionsCell]}>
              <span class="flex flex-wrap items-center justify-end gap-(--space-2)">
                <Button
                  variant="secondary"
                  size="sm"
                  href={listHref('/admin/reservations', { utilisateur: user.id })}
                >
                  <Icon name="calendar" />
                  Réservations
                  <span class="visually-hidden">de {fullName(user)}</span>
                </Button>
                {#if !self}
                  <Button variant="ghost" size="sm" iconOnly onclick={() => askDelete(user)}>
                    <Icon name="trash" />
                    <span class="visually-hidden">Supprimer le compte de {fullName(user)}</span>
                  </Button>
                {/if}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <Pagination
    {page}
    pageSize={ADMIN_PAGE_SIZE}
    total={load.total}
    hrefFor={(p) => listHref(PATH, { role, page: p })}
    itemLabel="Utilisateurs"
  />
{/if}

<Modal
  bind:open={deleteOpen}
  title={toDelete ? `Supprimer le compte de ${fullName(toDelete)} ?` : 'Supprimer le compte ?'}
  onclose={() => {
    toDelete = null;
    deleteError = null;
  }}
>
  <p>Ses salles éventuelles sont supprimées avec lui. Cette action est définitive.</p>
  {#if deleteError}
    <Alert variant="danger">{deleteError}</Alert>
  {/if}
  {#snippet footer()}
    <Button variant="secondary" onclick={() => (deleteOpen = false)}>Conserver</Button>
    <Button variant="danger" aria-busy={deleting} onclick={confirmDelete}>
      Supprimer le compte
    </Button>
  {/snippet}
</Modal>
