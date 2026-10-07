/*
 * Messages de validation des formulaires (cadrage.md § 2.6).
 *
 * Pas de schéma Zod dans le front : les champs portent des contraintes HTML natives
 * (`required`, `type="email"`, `type="url"`, `minlength`, `min`, `max`, `step`…), lues par
 * l'API de validation du navigateur (`ValidityState`). Ce module traduit cet état en message
 * français, avec les formulations de la maquette :
 *   - « Saisissez une adresse e-mail valide, par exemple nom@domaine.fr »
 *   - « Le mot de passe contient 6 caractères, il en faut au moins 8. »
 *   - « La capacité doit être d'au moins 1 personne. »
 *
 * `validationMessage` est pure (aucun accès au DOM) ; `fieldValidationMessage` lit les
 * contraintes sur l'élément et l'appelle, à la soumission (`form.checkValidity()`) ou à la
 * sortie d'un champ déjà en erreur (`onblur`).
 */

/** Clés du `ValidityState` traduites, dans l'ordre où elles sont examinées. */
export type ValidityKey =
  | 'valueMissing'
  | 'badInput'
  | 'typeMismatch'
  | 'tooShort'
  | 'tooLong'
  | 'rangeUnderflow'
  | 'rangeOverflow'
  | 'stepMismatch'
  | 'patternMismatch'
  | 'customError';

/** Sous-ensemble du `ValidityState` du navigateur : un objet littéral suffit dans les tests. */
export type ValidityFlags = Partial<Pick<ValidityState, ValidityKey | 'valid'>>;

/** Personnalisation propre à un champ, donnée par l'écran. */
export interface ValidationOptions {
  /**
   * Sujet des phrases, avec son article : « Le mot de passe », « La capacité ».
   * Par défaut : « Ce champ ».
   */
  subject?: string;
  /**
   * Unité des bornes `min` / `max` : `'€'` (invariable) ou `['personne', 'personnes']`
   * (singulier, pluriel). Donne « d'au moins 1 personne », « d'au plus 12 personnes ».
   */
  unit?: string | readonly [singular: string, plural: string];
  /** Message imposé pour un cas précis ; il remplace le message par défaut. */
  messages?: Partial<Record<ValidityKey, string>>;
}

/** Contraintes du champ, telles que lues sur l'élément. */
export interface ValidationConstraints extends ValidationOptions {
  /** Type du contrôle (`email`, `url`, `number`, `date`…). */
  type?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  /** Nombre de caractères saisis (pour `tooShort` / `tooLong`). */
  valueLength?: number;
  /** Message posé par `setCustomValidity()` (ex. confirmation du mot de passe). */
  customMessage?: string;
}

const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 });

/** Formate un nombre à la française (virgule décimale). */
function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** En français, le pluriel commence à 2 : « 0 caractère », « 1,5 heure », « 2 heures ». */
function plural(count: number, singular: string, pluralForm: string): string {
  return Math.abs(count) >= 2 ? pluralForm : singular;
}

/** « 1 personne », « 12 personnes », « 0 € », « 45 ». */
function quantity(value: number, unit: ValidationOptions['unit']): string {
  const formatted = formatNumber(value);
  if (unit === undefined) return formatted;
  const word = typeof unit === 'string' ? unit : plural(value, unit[0], unit[1]);
  return `${formatted} ${word}`;
}

function characters(count: number): string {
  return `${formatNumber(count)} ${plural(count, 'caractère', 'caractères')}`;
}

function typeMismatchMessage(type: string | undefined): string {
  if (type === 'email') return 'Saisissez une adresse e-mail valide, par exemple nom@domaine.fr';
  if (type === 'url') return 'Saisissez une adresse web complète, par exemple https://exemple.fr';
  return "Le format de la valeur n'est pas valide.";
}

function badInputMessage(type: string | undefined): string {
  if (type === 'number') return 'Saisissez un nombre.';
  if (type === 'date') return 'Saisissez une date valide.';
  if (type === 'time') return 'Saisissez une heure valide.';
  return "La valeur saisie n'est pas valide.";
}

function stepMismatchMessage(step: number | undefined): string {
  if (step === undefined) return "La valeur saisie n'est pas valide.";
  if (step === 1) return 'Saisissez un nombre entier.';
  return `Saisissez une valeur par pas de ${formatNumber(step)}.`;
}

/**
 * Message français correspondant au premier problème du `ValidityState`, ou `null` si le
 * champ est valide.
 */
export function validationMessage(
  validity: ValidityFlags,
  constraints: ValidationConstraints = {},
): string | null {
  const { subject = 'Ce champ', unit, messages = {}, type } = constraints;
  const pick = (key: ValidityKey, fallback: () => string): string => messages[key] ?? fallback();

  if (validity.valueMissing) {
    return pick('valueMissing', () => `${subject} est obligatoire.`);
  }
  if (validity.badInput) {
    return pick('badInput', () => badInputMessage(type));
  }
  if (validity.typeMismatch) {
    return pick('typeMismatch', () => typeMismatchMessage(type));
  }
  if (validity.tooShort) {
    return pick('tooShort', () => {
      const { minLength, valueLength } = constraints;
      if (minLength === undefined) return `${subject} est trop court.`;
      if (valueLength === undefined) {
        return `${subject} doit contenir au moins ${characters(minLength)}.`;
      }
      return `${subject} contient ${characters(valueLength)}, il en faut au moins ${formatNumber(minLength)}.`;
    });
  }
  if (validity.tooLong) {
    return pick('tooLong', () => {
      const { maxLength, valueLength } = constraints;
      if (maxLength === undefined) return `${subject} est trop long.`;
      if (valueLength === undefined) {
        return `${subject} doit contenir au plus ${characters(maxLength)}.`;
      }
      return `${subject} contient ${characters(valueLength)}, il en faut au plus ${formatNumber(maxLength)}.`;
    });
  }
  if (validity.rangeUnderflow) {
    return pick('rangeUnderflow', () =>
      constraints.min === undefined
        ? `${subject} est trop petit.`
        : `${subject} doit être d'au moins ${quantity(constraints.min, unit)}.`,
    );
  }
  if (validity.rangeOverflow) {
    return pick('rangeOverflow', () =>
      constraints.max === undefined
        ? `${subject} est trop grand.`
        : `${subject} doit être d'au plus ${quantity(constraints.max, unit)}.`,
    );
  }
  if (validity.stepMismatch) {
    return pick('stepMismatch', () => stepMismatchMessage(constraints.step));
  }
  if (validity.patternMismatch) {
    return pick('patternMismatch', () => typeMismatchMessage(undefined));
  }
  if (validity.customError) {
    return pick('customError', () => constraints.customMessage || typeMismatchMessage(undefined));
  }
  return null;
}

/** Contrôle de formulaire dont on lit la validité (seuls les champs utiles sont exigés). */
export interface ValidatableElement {
  validity: ValidityFlags;
  type?: string;
  value: string;
  validationMessage?: string;
  minLength?: number;
  maxLength?: number;
  min?: string;
  max?: string;
  step?: string;
}

/** Lit un attribut numérique (`min`, `max`, `step`) ; `undefined` s'il est absent ou non numérique. */
function readNumber(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/** `minLength` / `maxLength` valent -1 quand l'attribut est absent. */
function readLength(raw: number | undefined): number | undefined {
  return raw === undefined || raw < 0 ? undefined : raw;
}

/**
 * Message de validation d'un élément `<input>`, `<select>` ou `<textarea>`, ou `null`.
 *
 * Exemple (sortie d'un champ déjà en erreur) :
 *   onblur={(event) => {
 *     if (errors.capacity) errors.capacity = fieldValidationMessage(event.currentTarget, {
 *       subject: 'La capacité', unit: ['personne', 'personnes'] });
 *   }}
 */
export function fieldValidationMessage(
  element: ValidatableElement,
  options: ValidationOptions = {},
): string | null {
  return validationMessage(element.validity, {
    ...options,
    type: element.type,
    minLength: readLength(element.minLength),
    maxLength: readLength(element.maxLength),
    min: readNumber(element.min),
    max: readNumber(element.max),
    step: readNumber(element.step),
    valueLength: element.value.length,
    customMessage: element.validationMessage,
  });
}
