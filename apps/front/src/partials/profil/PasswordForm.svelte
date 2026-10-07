<!--
  Bloc « Changer mon mot de passe » de l'écran 05 (ajouté, absent de la maquette : décision 8,
  cadrage.md § 4 « 05 »).

  `changePassword({ currentPassword, newPassword })` (`PATCH /auth/password`, 204).
  - Confirmation vérifiée côté client (`setCustomValidity`, message dédié).
  - Succès : `role="status"` « Votre mot de passe a été modifié. » et champs vidés.
  - `400` (et `401`, hypothèse du cadrage) : « Le mot de passe actuel est incorrect. » sous le
    champ concerné. `changePassword` ne passe pas par `withSession` : un `401` n'entraîne donc
    pas de déconnexion sur cet écran.
-->
<script lang="ts">
  import { tick } from 'svelte';
  import Alert from '../../components/Alert.svelte';
  import Button from '../../components/Button.svelte';
  import Field from '../../components/Field.svelte';
  import Input from '../../components/Input.svelte';
  import { changePassword } from '../../data/auth/auth.queries';
  import { errorMessage } from '../../data/errors';
  import { fieldValidationMessage, type ValidationOptions } from '../../utils/validationMessage';

  type FieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';

  const MISMATCH = 'Les deux mots de passe ne sont pas identiques.';
  const WRONG_CURRENT = 'Le mot de passe actuel est incorrect.';

  const rules: Record<FieldName, ValidationOptions> = {
    currentPassword: { subject: 'Le mot de passe actuel' },
    newPassword: { subject: 'Le nouveau mot de passe' },
    confirmPassword: { subject: 'La confirmation' },
  };
  const order: FieldName[] = ['currentPassword', 'newPassword', 'confirmPassword'];

  const empty = (): Record<FieldName, string> => ({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  let values = $state(empty());
  let errors = $state<Record<FieldName, string | null>>({
    currentPassword: null,
    newPassword: null,
    confirmPassword: null,
  });
  let changed = $state(false);
  let failure = $state<string | null>(null);
  let submitting = $state(false);
  let form = $state<HTMLFormElement>();

  function control(name: FieldName): HTMLInputElement | null {
    const element = form?.elements.namedItem(name);
    return element instanceof HTMLInputElement ? element : null;
  }

  function validate(name: FieldName): boolean {
    const element = control(name);
    if (!element) return true;
    if (name === 'confirmPassword') {
      // Un champ vide reste « obligatoire » ; sinon, il doit être identique au nouveau.
      const mismatch = element.value !== '' && element.value !== values.newPassword;
      element.setCustomValidity(mismatch ? MISMATCH : '');
    }
    errors[name] = fieldValidationMessage(element, rules[name]);
    return errors[name] === null;
  }

  function revalidate(name: FieldName): void {
    if (errors[name]) validate(name);
  }

  async function focusField(name: FieldName): Promise<void> {
    await tick();
    control(name)?.focus();
  }

  async function onsubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (submitting) return;
    changed = false;
    failure = null;

    const [firstInvalid] = order.filter((name) => !validate(name));
    if (firstInvalid) {
      await focusField(firstInvalid);
      return;
    }

    submitting = true;
    const result = await changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    submitting = false;
    if (result.ok) {
      values = empty();
      changed = true;
      return;
    }
    const { status } = result.error;
    if (status === 400 || status === 401) {
      errors.currentPassword = WRONG_CURRENT;
      await focusField('currentPassword');
    } else {
      failure = errorMessage(result.error);
    }
  }
</script>

<section
  class="rounded-lg border border-border bg-surface shadow-sm"
  aria-labelledby="password-title"
>
  <form
    bind:this={form}
    class="flex flex-col gap-(--space-4) p-(--space-4) md:p-(--space-5)"
    novalidate
    {onsubmit}
  >
    <h2 id="password-title">Changer mon mot de passe</h2>

    {#if changed}
      <Alert variant="success">
        <p>Votre mot de passe a été modifié.</p>
      </Alert>
    {/if}
    {#if failure}
      <Alert variant="danger">
        <p>{failure}</p>
      </Alert>
    {/if}

    <Field label="Mot de passe actuel" id="currentPassword" error={errors.currentPassword}>
      {#snippet children(attrs)}
        <Input
          {...attrs}
          name="currentPassword"
          type="password"
          autocomplete="current-password"
          required
          bind:value={values.currentPassword}
          onblur={() => revalidate('currentPassword')}
        />
      {/snippet}
    </Field>
    <div class="grid gap-(--space-4) md:grid-cols-2">
      <Field
        label="Nouveau mot de passe"
        id="newPassword"
        hint="8 caractères minimum"
        error={errors.newPassword}
      >
        {#snippet children(attrs)}
          <Input
            {...attrs}
            name="newPassword"
            type="password"
            autocomplete="new-password"
            required
            minlength={8}
            bind:value={values.newPassword}
            onblur={() => revalidate('newPassword')}
          />
        {/snippet}
      </Field>
      <Field
        label="Confirmer le nouveau mot de passe"
        id="confirmPassword"
        error={errors.confirmPassword}
      >
        {#snippet children(attrs)}
          <Input
            {...attrs}
            name="confirmPassword"
            type="password"
            autocomplete="new-password"
            required
            bind:value={values.confirmPassword}
            onblur={() => revalidate('confirmPassword')}
          />
        {/snippet}
      </Field>
    </div>

    <div class="flex flex-wrap-reverse justify-end gap-(--space-3) pt-(--space-2)">
      <Button
        type="submit"
        class="max-md:flex-[1_1_100%]"
        aria-busy={submitting}
        aria-disabled={submitting}
      >
        Changer le mot de passe
      </Button>
    </div>
  </form>
</section>
