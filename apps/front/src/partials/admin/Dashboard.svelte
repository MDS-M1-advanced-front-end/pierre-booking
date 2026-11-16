<!--
  Administration : tableau de bord (`/admin`).
  Sur la période choisie (`?periode=`, 12 dernières semaines par défaut) : chiffres clés,
  chiffre d'affaires dans le temps, répartition par statut, salles et clients qui rapportent le
  plus. Les classements mènent à la liste des réservations filtrée.

  - Données : une seule requête GraphQL, `getDashboard` (`dashboard`) : le back ne calcule que les
    champs demandés. Les nombres de comptes et de salles ne dépendent pas de la période.
  - La série de l'API n'a que les intervalles avec des réservations : `fillTimeline` ajoute les
    autres, à zéro.
-->
<script lang="ts">
  import type { AdminDashboardQuery } from '@room-booking/core/graphql';
  import { onMount } from 'svelte';
  import ColumnChart from '../../components/ColumnChart.svelte';
  import ErrorState from '../../components/ErrorState.svelte';
  import SegmentedNav from '../../components/SegmentedNav.svelte';
  import Skeleton from '../../components/Skeleton.svelte';
  import StatusBadge from '../../components/StatusBadge.svelte';
  import { getDashboard } from '../../data/admin/admin.queries';
  import { errorMessage } from '../../data/errors';
  import { formatPrice } from '../../utils/formatPrice';
  import {
    bucketLabels,
    fillTimeline,
    fullName,
    listHref,
    parsePeriod,
    periodRange,
    PERIODS,
    type PeriodKey,
  } from './admin';

  type Dashboard = AdminDashboardQuery['dashboard'];

  /** Lignes des classements de salles et de clients. */
  const RANKING_LIMIT = 5;

  let period = $state<PeriodKey>('12s');
  let load = $state<
    | { type: 'loading' }
    | { type: 'error'; message: string }
    | { type: 'ready'; dashboard: Dashboard }
  >({ type: 'loading' });

  const range = $derived(periodRange(period));
  const granularity = $derived(PERIODS[period].granularity);

  async function fetchDashboard() {
    load = { type: 'loading' };
    const result = await getDashboard({
      period: range,
      granularity,
      limit: RANKING_LIMIT,
    });
    load = result.ok
      ? { type: 'ready', dashboard: result.data.dashboard }
      : { type: 'error', message: errorMessage(result.error) };
  }

  onMount(() => {
    period = parsePeriod(new URL(location.href).searchParams.get('periode'));
    void fetchDashboard();
  });

  const navItems = $derived(
    (Object.keys(PERIODS) as PeriodKey[]).map((key) => ({
      label: PERIODS[key].label,
      href: listHref('/admin', { periode: key === '12s' ? null : key }),
      current: period === key,
    })),
  );

  const UNIT = { DAY: 'jour', WEEK: 'semaine', MONTH: 'mois' } as const;

  const chartPoints = $derived(
    load.type === 'ready'
      ? fillTimeline(load.dashboard.timeline, granularity, range, (date) => ({
          date,
          reservations: 0,
          confirmedReservations: 0,
          revenue: 0,
        })).map((point) => ({ ...bucketLabels(point.date, granularity), value: point.revenue }))
      : [],
  );

  const integer = new Intl.NumberFormat('fr-FR');
  const hours = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  /** Axe du chiffre d'affaires : « 1 200 € », « 12 k€ » au-delà de 10 000. */
  const compactEuros = (value: number) =>
    value >= 10_000 ? `${integer.format(Math.round(value / 1000))} k€` : formatPrice(value);

  const sectionClass =
    'flex flex-col gap-(--space-4) rounded-lg border border-border bg-surface p-(--space-5)';
  const cellClass = 'border-t border-border py-(--space-2) text-left';
</script>

<SegmentedNav label="Période (jusqu'à aujourd'hui)" items={navItems} class="mb-(--space-5)" />

{#if load.type === 'loading'}
  <div class="flex flex-col gap-(--space-4)" aria-busy="true">
    <p class="visually-hidden" role="status">Chargement du tableau de bord…</p>
    <div class="grid grid-cols-2 gap-(--space-3) md:grid-cols-4">
      {#each [0, 1, 2, 3] as tile (tile)}
        <Skeleton class="h-24! rounded-lg!" />
      {/each}
    </div>
    <Skeleton class="h-64! w-full rounded-lg!" />
  </div>
{:else if load.type === 'error'}
  <ErrorState
    title="Le tableau de bord n'a pas pu être chargé"
    message={load.message}
    headingLevel={2}
    onretry={fetchDashboard}
  />
{:else}
  {@const { statistics, byStatus, rooms, topClients } = load.dashboard}
  <div class="flex flex-col gap-(--space-6)">
    <section aria-labelledby="kpi-title">
      <h2 id="kpi-title" class="visually-hidden">Chiffres clés</h2>
      <dl class="m-0 grid grid-cols-2 gap-(--space-3) md:grid-cols-4">
        {#each [{ label: "Chiffre d'affaires", value: formatPrice(statistics.totalRevenue) }, { label: 'Réservations', value: integer.format(statistics.totalReservations) }, { label: 'Confirmées', value: integer.format(statistics.confirmedReservations) }, { label: 'Annulées', value: integer.format(statistics.cancelledReservations) }] as tile (tile.label)}
          <div class="rounded-lg border border-border bg-surface p-(--space-4)">
            <dt class="text-sm text-text-muted">{tile.label}</dt>
            <dd class="m-0 mt-(--space-1) text-2xl font-semibold tabular-nums">{tile.value}</dd>
          </div>
        {/each}
      </dl>
      <p class="mt-(--space-2) text-sm text-text-muted">
        {integer.format(statistics.totalUsers)} comptes et {integer.format(statistics.totalRooms)} salles
        sur la plateforme, toutes périodes confondues.
      </p>
    </section>

    <section class={sectionClass} aria-labelledby="revenue-title">
      <h2 id="revenue-title" class="text-lg">Chiffre d'affaires par {UNIT[granularity]}</h2>
      {#if chartPoints.length === 0}
        <p class="text-text-muted">Aucune réservation sur la période.</p>
      {:else}
        <ColumnChart
          points={chartPoints}
          formatValue={compactEuros}
          label={`Chiffre d'affaires par ${UNIT[granularity]}`}
          columnLabel={UNIT[granularity].charAt(0).toUpperCase() + UNIT[granularity].slice(1)}
          valueLabel="Chiffre d'affaires"
        />
      {/if}
      <p class="text-sm text-text-muted">
        Réservations confirmées ou terminées, à la date de début.
      </p>
    </section>

    <div class="grid gap-(--space-6) md:grid-cols-2">
      <section class={sectionClass} aria-labelledby="status-title">
        <h2 id="status-title" class="text-lg">Par statut</h2>
        <table class="w-full border-collapse text-sm">
          <caption class="visually-hidden">Réservations par statut</caption>
          <thead>
            <tr class="text-text-muted">
              <th scope="col" class="pb-(--space-2) text-left">Statut</th>
              <th scope="col" class="pb-(--space-2) text-right">Nombre</th>
              <th scope="col" class="pb-(--space-2) text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {#each byStatus as line (line.status)}
              <tr>
                <th scope="row" class={[cellClass, 'font-regular']}>
                  <a href={listHref('/admin/reservations', { statut: line.status })}>
                    <StatusBadge status={line.status} />
                  </a>
                </th>
                <td class={[cellClass, 'text-right tabular-nums']}>{integer.format(line.count)}</td>
                <td class={[cellClass, 'text-right tabular-nums']}>{formatPrice(line.amount)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>

      <section class={sectionClass} aria-labelledby="rooms-title">
        <h2 id="rooms-title" class="text-lg">Salles qui rapportent le plus</h2>
        <table class="w-full border-collapse text-sm">
          <caption class="visually-hidden">Salles classées par chiffre d'affaires</caption>
          <thead>
            <tr class="text-text-muted">
              <th scope="col" class="pb-(--space-2) text-left">Salle</th>
              <th scope="col" class="pb-(--space-2) text-right">Heures</th>
              <th scope="col" class="pb-(--space-2) text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {#each rooms as line (line.room.id)}
              <tr>
                <th scope="row" class={[cellClass, 'font-regular']}>
                  <a href={listHref('/admin/reservations', { salle: line.room.id })}>
                    {line.room.name}
                  </a>
                  <span class="block text-xs text-text-muted">{line.room.location}</span>
                </th>
                <td class={[cellClass, 'text-right tabular-nums']}>
                  {hours.format(line.bookedHours)} h
                </td>
                <td class={[cellClass, 'text-right tabular-nums']}>{formatPrice(line.revenue)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    </div>

    <section class={sectionClass} aria-labelledby="clients-title">
      <h2 id="clients-title" class="text-lg">Meilleurs clients</h2>
      {#if topClients.length === 0}
        <p class="text-text-muted">Aucune réservation sur la période.</p>
      {:else}
        <table class="w-full border-collapse text-sm">
          <caption class="visually-hidden">Clients classés par chiffre d'affaires</caption>
          <thead>
            <tr class="text-text-muted">
              <th scope="col" class="pb-(--space-2) text-left">Client</th>
              <th scope="col" class="pb-(--space-2) text-right">Réservations</th>
              <th scope="col" class="pb-(--space-2) text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {#each topClients as line (line.user.id)}
              <tr>
                <th scope="row" class={[cellClass, 'font-regular']}>
                  <a href={listHref('/admin/reservations', { utilisateur: line.user.id })}>
                    {fullName(line.user)}
                  </a>
                </th>
                <td class={[cellClass, 'text-right tabular-nums']}>
                  {integer.format(line.reservations)}
                </td>
                <td class={[cellClass, 'text-right tabular-nums']}>{formatPrice(line.revenue)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>
  </div>
{/if}
