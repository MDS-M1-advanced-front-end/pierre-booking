<!--
  Îlot de l'écran 11 « Demandes » : garde d'accès (gestionnaire ou administrateur) autour de
  `RequestList`. Monté en `client:only="svelte"` par `pages/gestion/demandes.astro`.
-->
<script lang="ts">
  import RequireAuth from '../../components/RequireAuth.svelte';
  import RequestList from './RequestList.svelte';
</script>

<RequireAuth roles={['GESTIONNAIRE', 'ADMINISTRATEUR']}>
  {#snippet children(user)}
    <RequestList {user} />
  {/snippet}
</RequireAuth>
