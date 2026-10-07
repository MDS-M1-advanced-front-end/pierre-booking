<!--
  Contenu de la page « Mon profil » (écran 05), rendu par `ProfileIsland` une fois l'accès accordé.

  Affiche d'abord l'utilisateur de la session, puis le rafraîchit avec `getMe()` (qui met la
  session à jour, donc la prop `user`). Colonne principale : modification des informations, puis
  changement du mot de passe ; colonne latérale : « Mon compte » (rôle, membre depuis, lien vers
  l'espace du rôle).

  Props :
    user: User   utilisateur connecté (`session.user`)
-->
<script lang="ts">
  import type { User, UserRole } from '@room-booking/core';
  import { onMount } from 'svelte';
  import Badge from '../../components/Badge.svelte';
  import Button from '../../components/Button.svelte';
  import { getMe } from '../../data/auth/auth.queries';
  import { formatMemberSince } from '../../utils/dates';
  import { homePathForRole } from '../../utils/redirect';
  import PasswordForm from './PasswordForm.svelte';
  import ProfileForm from './ProfileForm.svelte';

  interface Props {
    user: User;
  }

  let { user }: Props = $props();

  const roleLabels: Record<UserRole, string> = {
    CLIENT: 'Client',
    GESTIONNAIRE: 'Gestionnaire',
    ADMINISTRATEUR: 'Administrateur',
  };

  // Rafraîchit le profil ; en cas d'erreur (hors 401, géré par la session), on garde celui de la
  // session, déjà affiché.
  onMount(() => {
    void getMe();
  });
</script>

<div class="grid gap-(--space-5) lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
  <div class="flex flex-col gap-(--space-5)">
    <ProfileForm {user} />
    <PasswordForm />
  </div>

  <aside
    class="rounded-lg border border-border bg-surface shadow-sm"
    aria-labelledby="account-title"
  >
    <div class="flex flex-col gap-(--space-4) p-(--space-4) md:p-(--space-5)">
      <h2 id="account-title">Mon compte</h2>
      <dl class="m-0 grid gap-(--space-3) md:grid-cols-[12rem_1fr]">
        <dt class="text-text-muted">Rôle</dt>
        <dd class="m-0 font-semibold">
          <Badge variant="neutral">{roleLabels[user.role]}</Badge>
        </dd>
        {#if user.createdAt}
          <dt class="text-text-muted">Membre depuis</dt>
          <dd class="m-0 font-semibold">{formatMemberSince(user.createdAt)}</dd>
        {/if}
      </dl>
      <Button variant="secondary" href={homePathForRole(user.role)}>
        {user.role === 'CLIENT' ? 'Voir mes réservations' : 'Voir mes salles'}
      </Button>
    </div>
  </aside>
</div>
