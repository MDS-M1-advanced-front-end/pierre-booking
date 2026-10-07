<!--
  Écran 09 « Ajouter / modifier une salle » (maquette : ecrans/09-salle-formulaire.html ;
  cadrage.md § 4 « 09 »). Formulaire de salle avec aperçu en direct de la carte du catalogue.

  - Création (`roomId` absent) : champs vides, `createRoom(body)`.
  - Modification : `getRoom(roomId)` pré-remplit le formulaire, puis `updateRoom(roomId, body)`
    avec l'objet complet (anomalie 2). Une salle d'un autre gestionnaire affiche « Accès refusé »
    (un administrateur peut modifier toutes les salles).
  - `status` n'est jamais envoyé : le statut reste en lecture seule (anomalie 6).
  - Validation (cadrage.md § 2.6) : formulaire en `novalidate`, contraintes HTML lues par
    `fieldValidationMessage` à la soumission puis à la sortie de chaque champ en erreur ;
    récapitulatif `ErrorSummary` focalisé à la soumission.
  - Succès : retour à « Mes salles » avec `?saved=1`.

  Props :
    user: User         utilisateur connecté (fourni par `RequireAuth`)
    roomId?: string    salle à modifier ; absent en création
-->
<script lang="ts">
  import type { Room, RoomCreateRequest, User } from '@room-booking/core';
  import { onMount, tick, untrack } from 'svelte';
  import Alert from '../../components/Alert.svelte';
  import Button from '../../components/Button.svelte';
  import Checkbox from '../../components/Checkbox.svelte';
  import ErrorState from '../../components/ErrorState.svelte';
  import ErrorSummary from '../../components/ErrorSummary.svelte';
  import Field from '../../components/Field.svelte';
  import Icon from '../../components/Icon.svelte';
  import Input from '../../components/Input.svelte';
  import RoomCard from '../../components/RoomCard.svelte';
  import Skeleton from '../../components/Skeleton.svelte';
  import Textarea from '../../components/Textarea.svelte';
  import { errorMessage } from '../../data/errors';
  import { equipmentOptionsFor } from '../../data/rooms/equipment';
  import { createRoom, getRoom, updateRoom } from '../../data/rooms/rooms.queries';
  import {
    fieldValidationMessage,
    type ValidatableElement,
    type ValidationOptions,
  } from '../../utils/validationMessage';
  import { theRoom } from './roomTitle';

  interface Props {
    user: User;
    roomId?: string;
  }

  let { user, roomId }: Props = $props();

  type LoadState =
    | { type: 'loading' }
    | { type: 'error'; status: number; message: string }
    | { type: 'forbidden' }
    | { type: 'ready'; room: Room | null };

  // En création, rien à charger (`roomId` ne change pas pendant la vie de la page).
  let load = $state<LoadState>(
    untrack(() => roomId) ? { type: 'loading' } : { type: 'ready', room: null },
  );

  // Valeurs saisies. `bind:value` d'un champ numérique donne `null` quand il est vide.
  let name = $state('');
  let description = $state('');
  let roomLocation = $state('');
  let capacity = $state<number | null>(null);
  let price = $state<number | null>(null);
  let equipment = $state<string[]>([]);
  let imageUrl = $state('');

  /** Champs validés, dans l'ordre du formulaire (ordre du récapitulatif). */
  const fields = [
    { id: 'name', label: 'Nom', rules: { subject: 'Le nom' } },
    { id: 'location', label: 'Lieu', rules: { subject: 'Le lieu' } },
    {
      id: 'capacity',
      label: 'Capacité',
      rules: { subject: 'La capacité', unit: ['personne', 'personnes'] },
    },
    { id: 'price', label: 'Tarif horaire', rules: { subject: 'Le tarif horaire', unit: '€' } },
    { id: 'imageUrl', label: 'Adresse de la photo', rules: { subject: "L'adresse de la photo" } },
  ] as const satisfies readonly { id: string; label: string; rules: ValidationOptions }[];

  type FieldId = (typeof fields)[number]['id'];

  let errors = $state<Partial<Record<FieldId, string | null>>>({});
  const summaryErrors = $derived(
    fields.flatMap(({ id, label }) => {
      const message = errors[id];
      return message ? [{ id, label, message }] : [];
    }),
  );

  let summary = $state<{ focus: () => void }>();
  let submitting = $state(false);
  let serverError = $state<string | null>(null);
  let serverErrorRegion = $state<HTMLDivElement>();

  const room = $derived(load.type === 'ready' ? load.room : null);
  /** Liste par défaut, plus les équipements de la salle qui n'y figurent pas. */
  const equipmentOptions = $derived(equipmentOptionsFor(room?.equipment));
  /** Équipements cochés, dans l'ordre de la liste. */
  const selectedEquipment = $derived(equipmentOptions.filter((item) => equipment.includes(item)));

  async function fetchRoom(id: string) {
    load = { type: 'loading' };
    const result = await getRoom(id);
    if (!result.ok) {
      load = {
        type: 'error',
        status: result.error.status,
        message: errorMessage(result.error),
      };
      return;
    }
    const data = result.data;
    if (data.ownerId !== user.id && user.role !== 'ADMINISTRATEUR') {
      load = { type: 'forbidden' };
      return;
    }
    name = data.name;
    description = data.description ?? '';
    roomLocation = data.location;
    capacity = data.capacity;
    price = data.pricePerHour;
    equipment = [...(data.equipment ?? [])];
    imageUrl = data.imageUrl ?? '';
    load = { type: 'ready', room: data };
  }

  onMount(() => {
    if (roomId) void fetchRoom(roomId);
  });

  function toggleEquipment(item: string, checked: boolean) {
    equipment = checked
      ? [...equipment.filter((value) => value !== item), item]
      : equipment.filter((value) => value !== item);
  }

  /** Message d'erreur d'un champ ; un texte fait uniquement d'espaces compte comme vide. */
  function messageFor(
    element: ValidatableElement & { required?: boolean },
    rules: ValidationOptions,
  ) {
    const message = fieldValidationMessage(element, rules);
    if (message) return message;
    if (element.required && element.value.trim() === '') {
      return `${rules.subject ?? 'Ce champ'} est obligatoire.`;
    }
    return null;
  }

  function control(form: HTMLFormElement, id: FieldId): HTMLInputElement | null {
    const element = form.elements.namedItem(id);
    return element instanceof HTMLInputElement ? element : null;
  }

  /** À la sortie d'un champ déjà en erreur, on réévalue son message. */
  function revalidate(id: FieldId, element: HTMLInputElement) {
    if (!errors[id]) return;
    const field = fields.find((item) => item.id === id);
    if (field) errors[id] = messageFor(element, field.rules);
  }

  /** Adresse utilisable par l'aperçu : seulement une URL http(s) complète. */
  function previewImage(value: string): string | undefined {
    const trimmed = value.trim();
    if (!URL.canParse(trimmed)) return undefined;
    const { protocol } = new URL(trimmed);
    return protocol === 'http:' || protocol === 'https:' ? trimmed : undefined;
  }

  // Aperçu dans le catalogue, alimenté par la saisie en cours (valeurs lisibles si vide).
  const preview = $derived<Room>({
    id: roomId ?? 'apercu',
    name: name.trim() || 'Nom de la salle',
    description: description.trim(),
    location: roomLocation.trim() || 'Lieu',
    capacity: typeof capacity === 'number' && capacity >= 1 ? capacity : 1,
    pricePerHour: typeof price === 'number' && price >= 0 ? price : 0,
    equipment: selectedEquipment,
    imageUrl: previewImage(imageUrl),
    status: room?.status ?? 'ACTIVE',
    ownerId: room?.ownerId ?? user.id,
  });

  async function handleSubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    serverError = null;

    const next: Partial<Record<FieldId, string | null>> = {};
    for (const { id, rules } of fields) {
      const element = control(form, id);
      next[id] = element ? messageFor(element, rules) : null;
    }
    errors = next;
    if (summaryErrors.length > 0) {
      await tick();
      summary?.focus();
      return;
    }

    // Objet complet, en création comme en modification (anomalie 2), sans `status` (anomalie 6).
    const trimmedUrl = imageUrl.trim();
    const body: RoomCreateRequest = {
      name: name.trim(),
      description: description.trim(),
      location: roomLocation.trim(),
      capacity: Number(capacity),
      pricePerHour: Number(price),
      equipment: selectedEquipment,
      ...(trimmedUrl !== '' && { imageUrl: trimmedUrl }),
    };

    submitting = true;
    const result = roomId ? await updateRoom(roomId, body) : await createRoom(body);
    if (!result.ok) {
      submitting = false;
      serverError = errorMessage(result.error, {
        403: "Vous n'avez pas les droits pour modifier cette salle.",
        404: "Cette salle n'existe plus.",
      });
      await tick();
      serverErrorRegion?.focus();
      return;
    }
    location.assign('/gestion/salles?saved=1');
  }
</script>

{#snippet backLink()}
  <a
    class="mb-(--space-3) inline-flex min-h-(--size-target-min) items-center gap-(--space-1) text-sm"
    href="/gestion/salles"
  >
    <Icon name="left" />
    Mes salles
  </a>
{/snippet}

{#if load.type === 'loading'}
  {@render backLink()}
  <div class="flex flex-col gap-(--space-3)" aria-busy="true">
    <p class="visually-hidden" role="status">Chargement de la salle…</p>
    <Skeleton class="h-8 w-1/2" />
    <Skeleton class="w-2/5" />
    <Skeleton variant="image" class="max-h-72 rounded-lg" />
  </div>
{:else if load.type === 'forbidden'}
  <div
    class="flex flex-col items-center gap-(--space-3) rounded-lg border border-dashed border-border-strong bg-surface px-(--space-4) py-(--space-8) text-center"
    role="alert"
  >
    <Icon name="alert" class="size-12 stroke-[1.5] text-text-muted" />
    <h1>Accès refusé</h1>
    <p class="max-w-md text-text-muted">
      Vous n'êtes pas gestionnaire de cette salle : vous ne pouvez pas la modifier.
    </p>
    <Button href="/gestion/salles">Voir mes salles</Button>
  </div>
{:else if load.type === 'error'}
  {@render backLink()}
  {#if load.status === 404}
    <h1 class="mb-(--space-5)">Salle introuvable</h1>
    <p class="text-text-muted">Cette salle n'existe pas ou a été supprimée.</p>
  {:else}
    <h1 class="mb-(--space-5)">Modifier une salle</h1>
    <ErrorState
      title="La salle n'a pas pu être chargée"
      message={load.message}
      headingLevel={2}
      onretry={() => roomId && fetchRoom(roomId)}
    />
  {/if}
{:else}
  {@render backLink()}
  <div class="mb-(--space-5)">
    <h1>{room ? `Modifier ${theRoom(room.name)}` : 'Ajouter une salle'}</h1>
    <p class="mt-(--space-1) text-text-muted">
      Les champs marqués d'un astérisque (<span class="text-danger-text">*</span>) sont
      obligatoires.
    </p>
  </div>

  <div class="grid gap-(--space-5) lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
    <form
      class="rounded-lg border border-border bg-surface shadow-sm"
      novalidate
      onsubmit={handleSubmit}
    >
      <div class="flex flex-col gap-(--space-4) p-(--space-4) md:p-(--space-5)">
        <ErrorSummary bind:this={summary} errors={summaryErrors} />

        {#if serverError}
          <div bind:this={serverErrorRegion} tabindex="-1" class="rounded-md">
            <Alert variant="danger">{serverError}</Alert>
          </div>
        {/if}

        <Field label="Nom" id="name" required error={errors.name}>
          {#snippet children(attrs)}
            <Input
              {...attrs}
              name="name"
              type="text"
              required
              autocomplete="off"
              bind:value={name}
              onblur={(event) => revalidate('name', event.currentTarget)}
            />
          {/snippet}
        </Field>

        <Field label="Description" id="description">
          {#snippet children(attrs)}
            <Textarea {...attrs} name="description" rows={3} bind:value={description} />
          {/snippet}
        </Field>

        <Field label="Lieu" id="location" required error={errors.location}>
          {#snippet children(attrs)}
            <Input
              {...attrs}
              name="location"
              type="text"
              required
              bind:value={roomLocation}
              onblur={(event) => revalidate('location', event.currentTarget)}
            />
          {/snippet}
        </Field>

        <div class="grid gap-(--space-4) md:grid-cols-2">
          <Field label="Capacité" id="capacity" required suffix="pers." error={errors.capacity}>
            {#snippet children(attrs)}
              <Input
                {...attrs}
                name="capacity"
                type="number"
                min="1"
                inputmode="numeric"
                required
                bind:value={capacity}
                onblur={(event) => revalidate('capacity', event.currentTarget)}
              />
            {/snippet}
          </Field>

          <Field label="Tarif horaire" id="price" required suffix="€ / h" error={errors.price}>
            {#snippet children(attrs)}
              <Input
                {...attrs}
                name="price"
                type="number"
                min="0"
                step="0.01"
                inputmode="decimal"
                required
                bind:value={price}
                onblur={(event) => revalidate('price', event.currentTarget)}
              />
            {/snippet}
          </Field>
        </div>

        <fieldset class="m-0 border-0 p-0">
          <legend class="mb-(--space-2) p-0 font-semibold">Équipements</legend>
          <div
            class="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-x-(--space-4) gap-y-(--space-2)"
          >
            {#each equipmentOptions as item (item)}
              <Checkbox
                name="equipment"
                value={item}
                checked={equipment.includes(item)}
                onchange={(event) => toggleEquipment(item, event.currentTarget.checked)}
              >
                {item}
              </Checkbox>
            {/each}
          </div>
        </fieldset>

        <Field
          label="Adresse de la photo"
          id="imageUrl"
          hint="URL complète d'une image en ligne (JPEG ou PNG)."
          error={errors.imageUrl}
        >
          {#snippet children(attrs)}
            <Input
              {...attrs}
              name="imageUrl"
              type="url"
              placeholder="https://…"
              bind:value={imageUrl}
              onblur={(event) => revalidate('imageUrl', event.currentTarget)}
            />
          {/snippet}
        </Field>

        <div
          class="flex flex-wrap-reverse justify-end gap-(--space-3) pt-(--space-2) max-md:*:flex-[1_1_100%]"
        >
          <Button variant="secondary" href="/gestion/salles">Annuler</Button>
          <Button type="submit" aria-busy={submitting}>Enregistrer</Button>
        </div>
      </div>
    </form>

    <aside
      class="flex flex-col gap-(--space-4) lg:sticky lg:top-[calc(4rem+var(--space-4))]"
      aria-labelledby="preview-title"
    >
      <h2 id="preview-title" class="text-sm text-text-muted">Aperçu dans le catalogue</h2>
      <!-- Aperçu purement visuel : son lien ne mène nulle part tant que la salle n'est pas enregistrée. -->
      <ul class="m-0 list-none p-0" inert>
        <li><RoomCard room={preview} /></li>
      </ul>
    </aside>
  </div>
{/if}
