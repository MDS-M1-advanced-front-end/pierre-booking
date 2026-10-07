<script lang="ts">
  // Garde d'accès d'un îlot `client:only` (cadrage.md § 2.3) : confort d'interface seulement,
  // la vraie sécurité reste le contrôle des droits par l'API.
  import type { User, UserRole } from '@room-booking/core';
  import { onMount, type Snippet } from 'svelte';
  import { restoreSession, session } from '../data/auth/session.svelte';
  import { decideAccess } from '../utils/redirect';
  import Skeleton from './Skeleton.svelte';

  interface Props {
    /** Rôles autorisés ; absent : tout utilisateur connecté. */
    roles?: UserRole[];
    /** Contenu protégé, rendu avec l'utilisateur connecté. */
    children: Snippet<[User]>;
  }

  let { roles, children }: Props = $props();

  let allowed = $state(false);

  onMount(() => {
    const decision = decideAccess(restoreSession(), roles, location.pathname + location.search);
    if (decision.type === 'allow') {
      allowed = true;
    } else {
      location.replace(decision.url);
    }
  });

  // Si la session disparaît ensuite (déconnexion, 401), le contenu n'est plus affiché.
  const user = $derived(allowed ? session.user : null);
</script>

{#if user}
  {@render children(user)}
{:else}
  <div class="flex flex-col gap-(--space-3)" aria-busy="true">
    <p class="visually-hidden" role="status">Chargement…</p>
    <Skeleton class="w-2/5" />
    <Skeleton class="w-3/5" />
    <Skeleton class="w-1/2" />
  </div>
{/if}
