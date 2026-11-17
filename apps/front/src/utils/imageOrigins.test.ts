import { describe, expect, it } from 'vitest';
import { imageOrigins } from './imageOrigins';

describe('imageOrigins', () => {
  it('renvoie le domaine vers lequel picsum.photos redirige, une seule fois', () => {
    expect(
      imageOrigins([
        'https://picsum.photos/seed/room-01/800/600',
        'https://picsum.photos/seed/room-02/800/600',
      ]),
    ).toEqual(['https://fastly.picsum.photos']);
  });

  it('ignore les hébergeurs sans redirection connue : l’image est découverte dans le HTML', () => {
    expect(imageOrigins(['https://images.example/a.jpg'])).toEqual([]);
  });

  it('ignore les valeurs vides ou invalides', () => {
    expect(
      imageOrigins([null, undefined, '', 'pas une adresse', 'data:image/png;base64,AA']),
    ).toEqual([]);
  });
});
