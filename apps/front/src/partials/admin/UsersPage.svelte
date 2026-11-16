<!--
  Îlot de l'administration (gestion des utilisateurs) : garde d'accès (administrateurs) autour de
  `UserList`. Monté en `client:only="svelte"` par `pages/admin/utilisateurs.astro`.
-->
<script lang="ts">
  import RequireAuth from '../../components/RequireAuth.svelte';
  import UserList from './UserList.svelte';
</script>

<RequireAuth roles={['ADMINISTRATEUR']}>
  {#snippet children(user)}
    <UserList currentUserId={user.id} />
  {/snippet}
</RequireAuth>
