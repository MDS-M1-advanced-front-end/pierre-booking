import { describe, expect, it } from 'vitest';
import {
  fieldValidationMessage,
  validationMessage,
  type ValidatableElement,
} from './validationMessage';

describe('validationMessage', () => {
  it('renvoie null pour un champ valide', () => {
    expect(validationMessage({ valid: true })).toBeNull();
    expect(validationMessage({})).toBeNull();
  });

  describe('champ obligatoire', () => {
    it('utilise « Ce champ » par défaut', () => {
      expect(validationMessage({ valueMissing: true })).toBe('Ce champ est obligatoire.');
    });

    it('utilise le sujet donné', () => {
      expect(validationMessage({ valueMissing: true }, { subject: 'Le prénom' })).toBe(
        'Le prénom est obligatoire.',
      );
    });

    it("passe avant les autres problèmes (l'ordre des clés est fixe)", () => {
      expect(validationMessage({ valueMissing: true, typeMismatch: true }, { type: 'email' })).toBe(
        'Ce champ est obligatoire.',
      );
    });
  });

  describe('format', () => {
    it("reprend le message de la maquette pour l'e-mail", () => {
      expect(validationMessage({ typeMismatch: true }, { type: 'email' })).toBe(
        'Saisissez une adresse e-mail valide, par exemple nom@domaine.fr',
      );
    });

    it("explique le format d'une URL", () => {
      expect(validationMessage({ typeMismatch: true }, { type: 'url' })).toBe(
        'Saisissez une adresse web complète, par exemple https://exemple.fr',
      );
    });

    it('a un message générique pour un autre type', () => {
      expect(validationMessage({ typeMismatch: true }, { type: 'tel' })).toBe(
        "Le format de la valeur n'est pas valide.",
      );
    });

    it('traite le motif (pattern) comme un format invalide', () => {
      expect(validationMessage({ patternMismatch: true })).toBe(
        "Le format de la valeur n'est pas valide.",
      );
    });

    it.each([
      ['number', 'Saisissez un nombre.'],
      ['date', 'Saisissez une date valide.'],
      ['time', 'Saisissez une heure valide.'],
      ['text', "La valeur saisie n'est pas valide."],
    ])('traduit une saisie illisible (badInput) pour le type %s', (type, expected) => {
      expect(validationMessage({ badInput: true }, { type })).toBe(expected);
    });
  });

  describe('longueur', () => {
    it('reprend le message de la maquette pour le mot de passe', () => {
      expect(
        validationMessage(
          { tooShort: true },
          { subject: 'Le mot de passe', minLength: 8, valueLength: 6 },
        ),
      ).toBe('Le mot de passe contient 6 caractères, il en faut au moins 8.');
    });

    it('accorde « caractère » au singulier', () => {
      expect(validationMessage({ tooShort: true }, { minLength: 8, valueLength: 1 })).toBe(
        'Ce champ contient 1 caractère, il en faut au moins 8.',
      );
    });

    it('se passe de la longueur saisie si elle est inconnue', () => {
      expect(validationMessage({ tooShort: true }, { minLength: 8 })).toBe(
        'Ce champ doit contenir au moins 8 caractères.',
      );
    });

    it('se passe de la longueur minimale si elle est inconnue', () => {
      expect(validationMessage({ tooShort: true }, { subject: 'Le nom' })).toBe(
        'Le nom est trop court.',
      );
    });

    it('traduit une valeur trop longue', () => {
      expect(
        validationMessage(
          { tooLong: true },
          { subject: 'Le commentaire', maxLength: 500, valueLength: 512 },
        ),
      ).toBe('Le commentaire contient 512 caractères, il en faut au plus 500.');
      expect(validationMessage({ tooLong: true }, { maxLength: 1 })).toBe(
        'Ce champ doit contenir au plus 1 caractère.',
      );
      expect(validationMessage({ tooLong: true })).toBe('Ce champ est trop long.');
    });
  });

  describe('bornes numériques', () => {
    it('reprend le message de la maquette pour la capacité', () => {
      expect(
        validationMessage(
          { rangeUnderflow: true },
          { subject: 'La capacité', min: 1, unit: ['personne', 'personnes'] },
        ),
      ).toBe("La capacité doit être d'au moins 1 personne.");
    });

    it("accorde l'unité au pluriel à partir de 2", () => {
      expect(
        validationMessage(
          { rangeOverflow: true },
          { subject: 'Le nombre de participants', max: 12, unit: ['personne', 'personnes'] },
        ),
      ).toBe("Le nombre de participants doit être d'au plus 12 personnes.");
    });

    it('accepte une unité invariable et formate à la française', () => {
      expect(
        validationMessage(
          { rangeUnderflow: true },
          { subject: 'Le tarif horaire', min: 0.5, unit: '€' },
        ),
      ).toBe("Le tarif horaire doit être d'au moins 0,5 €.");
    });

    it('fonctionne sans unité ni sujet', () => {
      expect(validationMessage({ rangeUnderflow: true }, { min: 0 })).toBe(
        "Ce champ doit être d'au moins 0.",
      );
    });

    it('se passe des bornes si elles sont inconnues', () => {
      expect(validationMessage({ rangeUnderflow: true })).toBe('Ce champ est trop petit.');
      expect(validationMessage({ rangeOverflow: true })).toBe('Ce champ est trop grand.');
    });
  });

  describe('pas (step)', () => {
    it('demande un nombre entier pour un pas de 1', () => {
      expect(validationMessage({ stepMismatch: true }, { step: 1 })).toBe(
        'Saisissez un nombre entier.',
      );
    });

    it('donne le pas sinon', () => {
      expect(validationMessage({ stepMismatch: true }, { step: 0.01 })).toBe(
        'Saisissez une valeur par pas de 0,01.',
      );
    });

    it('a un message générique sans pas connu', () => {
      expect(validationMessage({ stepMismatch: true })).toBe("La valeur saisie n'est pas valide.");
    });
  });

  describe('erreur personnalisée (setCustomValidity)', () => {
    it('affiche le message posé par le formulaire', () => {
      expect(
        validationMessage(
          { customError: true },
          { customMessage: 'Les deux mots de passe ne correspondent pas.' },
        ),
      ).toBe('Les deux mots de passe ne correspondent pas.');
    });

    it('a un message générique si le message est vide', () => {
      expect(validationMessage({ customError: true }, { customMessage: '' })).toBe(
        "Le format de la valeur n'est pas valide.",
      );
    });
  });

  it('laisse un champ imposer son message pour un cas précis', () => {
    const messages = { rangeUnderflow: 'Le tarif ne peut pas être négatif.' };
    expect(validationMessage({ rangeUnderflow: true }, { min: 0, messages })).toBe(
      'Le tarif ne peut pas être négatif.',
    );
    // Les autres cas gardent leur message par défaut.
    expect(validationMessage({ valueMissing: true }, { messages })).toBe(
      'Ce champ est obligatoire.',
    );
  });
});

describe('fieldValidationMessage', () => {
  /** Élément minimal, comme ceux du navigateur (`minLength` vaut -1 sans attribut). */
  function element(overrides: Partial<ValidatableElement>): ValidatableElement {
    return {
      validity: { valid: true },
      type: 'text',
      value: '',
      validationMessage: '',
      minLength: -1,
      maxLength: -1,
      min: '',
      max: '',
      step: '',
      ...overrides,
    };
  }

  it('renvoie null pour un élément valide', () => {
    expect(fieldValidationMessage(element({}))).toBeNull();
  });

  it('lit minlength et la longueur saisie sur l’élément', () => {
    const input = element({
      type: 'password',
      value: 'abc123',
      minLength: 8,
      validity: { valid: false, tooShort: true },
    });
    expect(fieldValidationMessage(input, { subject: 'Le mot de passe' })).toBe(
      'Le mot de passe contient 6 caractères, il en faut au moins 8.',
    );
  });

  it('lit min, max et step (chaînes) sur l’élément', () => {
    const capacity = element({
      type: 'number',
      value: '0',
      min: '1',
      validity: { valid: false, rangeUnderflow: true },
    });
    expect(
      fieldValidationMessage(capacity, {
        subject: 'La capacité',
        unit: ['personne', 'personnes'],
      }),
    ).toBe("La capacité doit être d'au moins 1 personne.");

    const price = element({
      type: 'number',
      value: '1.234',
      step: '0.01',
      validity: { valid: false, stepMismatch: true },
    });
    expect(fieldValidationMessage(price)).toBe('Saisissez une valeur par pas de 0,01.');
  });

  it('ignore un step non numérique (« any ») et un minlength absent (-1)', () => {
    const input = element({ step: 'any', validity: { valid: false, stepMismatch: true } });
    expect(fieldValidationMessage(input)).toBe("La valeur saisie n'est pas valide.");
    const text = element({ value: 'ab', validity: { valid: false, tooShort: true } });
    expect(fieldValidationMessage(text)).toBe('Ce champ est trop court.');
  });

  it('lit le type et le message personnalisé', () => {
    expect(
      fieldValidationMessage(
        element({ type: 'email', value: 'lea@', validity: { valid: false, typeMismatch: true } }),
      ),
    ).toBe('Saisissez une adresse e-mail valide, par exemple nom@domaine.fr');
    expect(
      fieldValidationMessage(
        element({
          validationMessage: 'Les deux mots de passe ne correspondent pas.',
          validity: { valid: false, customError: true },
        }),
      ),
    ).toBe('Les deux mots de passe ne correspondent pas.');
  });

  it('fonctionne avec un <select> (sans min, max ni longueur)', () => {
    const select: ValidatableElement = {
      validity: { valid: false, valueMissing: true },
      type: 'select-one',
      value: '',
    };
    expect(fieldValidationMessage(select, { subject: 'Le lieu' })).toBe('Le lieu est obligatoire.');
  });
});
