<!--
  Îlot de l'administration (tableau de bord) : garde d'accès (administrateurs) autour de
  `Dashboard`. Monté en `client:only="svelte"` par `pages/admin/index.astro`.
-->
<script lang="ts">
  import RequireAuth from '../../components/RequireAuth.svelte';
  import Dashboard from './Dashboard.svelte';
</script>

<RequireAuth roles={['ADMINISTRATEUR']}>
  <Dashboard />
</RequireAuth>
