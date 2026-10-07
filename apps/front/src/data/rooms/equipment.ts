// Équipements proposés dans le formulaire de salle (écran 09, cadrage.md § 4 « 09 »).
// Liste du jeu de données, dans l'ordre de la maquette. Le contrat accepte n'importe quelle
// chaîne : une salle peut avoir un équipement absent de cette liste (ex. « Écran 32" »).

/** Les 10 équipements proposés par défaut. */
export const EQUIPMENT_OPTIONS: readonly string[] = [
  'Écran 65"',
  'Tableau blanc',
  'Wi-Fi',
  'Vidéoprojecteur',
  'Paperboard',
  'Caméra visio',
  'Sonorisation',
  'Micros sans fil',
  'Postes informatiques',
  'Cuisine',
];

/**
 * Équipements à proposer pour une salle : la liste par défaut, suivie de ceux de la salle qui
 * n'y figurent pas (pour pouvoir les décocher en modification).
 * @param roomEquipment - Équipements actuels de la salle.
 */
export function equipmentOptionsFor(roomEquipment: readonly string[] = []): string[] {
  const extra = roomEquipment.filter((item) => !EQUIPMENT_OPTIONS.includes(item));
  return [...EQUIPMENT_OPTIONS, ...new Set(extra)];
}
