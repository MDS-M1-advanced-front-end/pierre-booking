<script lang="ts">
  import type { User } from '@room-booking/core';
  import { onMount } from 'svelte';
  import { logout } from '../data/auth/auth.queries';
  import { restoreSession, session } from '../data/auth/session.svelte';
  import { listMyReservations } from '../data/reservations/reservations.queries';
  import Button from './Button.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    /** Chemin de la page courante, pour `aria-current="page"`. */
    currentPath: string;
    /**
     * Nombre de demandes en attente (gestionnaire), s'il est déjà connu. Sinon l'en-tête le charge
     * lui-même pour un gestionnaire ou un administrateur (aucune requête pour un visiteur ou un client).
     */
    pendingCount?: number;
  }

  let { currentPath, pendingCount }: Props = $props();

  /** Nombre chargé par l'en-tête ; `undefined` tant qu'il n'est pas connu ou en cas d'échec. */
  let loadedCount = $state<number | undefined>(undefined);
  const shownCount = $derived(pendingCount ?? loadedCount);

  interface NavLink {
    href: string;
    label: string;
  }

  onMount(() => {
    restoreSession();
  });

  const user = $derived(session.user);
  const isManager = $derived(user?.role === 'GESTIONNAIRE' || user?.role === 'ADMINISTRATEUR');

  /**
   * Demandes en attente du gestionnaire (`GET /reservations?status=PENDING`, anomalie 4 : on suppose
   * que la route renvoie les réservations de ses salles). On compte les réservations `PENDING`
   * reçues, au cas où le filtre serait ignoré (c'est le cas du mock Prism) ; si toutes le sont, on
   * prend le `total`, qui couvre les pages suivantes. Échec silencieux : pas de compteur.
   */
  async function loadPendingCount(): Promise<void> {
    const result = await listMyReservations({ status: 'PENDING', pageSize: 100 });
    if (!result.ok) return;
    const items = result.data.items ?? [];
    const pending = items.filter((reservation) => reservation.status === 'PENDING').length;
    loadedCount = pending === items.length ? Math.max(result.data.total ?? 0, pending) : pending;
  }

  $effect(() => {
    if (isManager && pendingCount === undefined) void loadPendingCount();
  });

  const links = $derived.by<NavLink[]>(() => {
    const catalogue = { href: '/', label: 'Catalogue' };
    if (!user) return [catalogue];
    if (isManager) {
      return [
        catalogue,
        { href: '/gestion/salles', label: 'Mes salles' },
        { href: '/gestion/demandes', label: 'Demandes' },
      ];
    }
    return [catalogue, { href: '/reservations', label: 'Mes réservations' }];
  });

  // Une sous-page marque sa rubrique comme dans la maquette (fiche salle → Catalogue,
  // modification d'une réservation → Mes réservations…).
  function isCurrent(href: string): boolean {
    const path = currentPath.replace(/\/+$/, '') || '/';
    if (href === '/') return path === '/' || path.startsWith('/salles/');
    return path === href || path.startsWith(`${href}/`);
  }

  function initials(u: User): string {
    return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();
  }

  function handleLogout(): void {
    logout();
    location.assign('/');
  }

  const linkClass = [
    'inline-flex min-h-(--size-control) items-center gap-(--space-2) rounded-md px-(--space-3)',
    'font-semibold text-text no-underline hover:bg-action-subtle hover:text-action',
    'aria-[current=page]:bg-action-subtle aria-[current=page]:text-action',
  ];
</script>

{#snippet navItems(mobile: boolean)}
  <ul
    class={[
      'm-0 flex list-none gap-(--space-1) p-0',
      mobile ? 'flex-col items-stretch' : 'items-center',
    ]}
  >
    {#each links as link (link.href)}
      <li>
        <a
          class={linkClass}
          href={link.href}
          aria-current={isCurrent(link.href) ? 'page' : undefined}
        >
          {link.label}
          {#if link.href === '/gestion/demandes' && shownCount}
            <span
              class="inline-grid h-[1.375rem] min-w-[1.375rem] place-items-center rounded-full bg-accent px-(--space-1) text-xs font-bold text-on-accent"
              aria-hidden="true">{shownCount}</span
            >
            <span class="visually-hidden">({shownCount} en attente)</span>
          {/if}
        </a>
      </li>
    {/each}
    <li
      class={['bg-border', mobile ? 'my-(--space-2) h-px' : 'mx-(--space-2) h-6 w-px']}
      aria-hidden="true"
    ></li>
    {#if user}
      <li>
        <a
          class={linkClass}
          href="/profil"
          aria-current={isCurrent('/profil') ? 'page' : undefined}
        >
          <span
            class="inline-grid size-8 place-items-center rounded-full bg-action text-xs font-bold text-on-action"
            aria-hidden="true">{initials(user)}</span
          >
          {user.firstName}
          {user.lastName}
        </a>
      </li>
      <li>
        <Button variant="ghost" size="sm" onclick={handleLogout}>
          <Icon name="logout" />
          Se déconnecter
        </Button>
      </li>
    {:else}
      <li>
        <Button variant="secondary" size="sm" href="/connexion">Se connecter</Button>
      </li>
      <li>
        <Button size="sm" href="/inscription">Créer un compte</Button>
      </li>
    {/if}
  </ul>
{/snippet}

<header class="sticky top-0 z-(--z-header) border-b border-border bg-surface">
  <div
    class="mx-auto flex min-h-16 w-full max-w-(--size-container) items-center justify-between gap-(--space-4) px-(--space-4) md:px-(--space-6)"
  >
    <a
      class={['inline-flex items-center gap-(--space-2) text-lg font-bold text-text no-underline']}
      href="/"
    >
      <svg class="size-8" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--color-action)" />
        <circle
          cx="15"
          cy="15"
          r="7"
          fill="none"
          stroke="var(--color-on-action)"
          stroke-width="3"
        />
        <path
          d="m19.5 19.5 5 5"
          stroke="var(--color-accent)"
          stroke-width="3.5"
          stroke-linecap="round"
        />
      </svg>
      Quorum
    </a>

    <nav class="hidden lg:block" aria-label="Navigation principale">
      {@render navItems(false)}
    </nav>

    <details class="group relative lg:hidden">
      <summary
        class={[
          'inline-grid size-(--size-control) cursor-pointer list-none place-items-center rounded-md',
          'hover:bg-action-subtle group-open:bg-action-subtle group-open:text-action',
          '[&::-webkit-details-marker]:hidden',
        ]}
      >
        <Icon name="menu" />
        <span class="visually-hidden">Menu</span>
      </summary>
      <nav
        class="absolute top-[calc(100%+var(--space-2))] right-0 w-[min(18rem,calc(100vw-2*var(--space-4)))] rounded-lg border border-border bg-surface p-(--space-2) shadow-lg"
        aria-label="Menu principal"
      >
        {@render navItems(true)}
      </nav>
    </details>
  </div>
</header>
