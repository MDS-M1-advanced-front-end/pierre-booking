import { describe, expect, it } from 'vitest';
import { imageOrigins } from './imageOrigins';

describe('imageOrigins', () => {
  it('renvoie les origines distinctes, dans l’ordre des images', () => {
    expect(
      imageOrigins([
        'https://images.example/a.jpg',
        'https://cdn.example/b.jpg',
        'https://images.example/c.jpg',
      ]),
    ).toEqual(['https://images.example', 'https://cdn.example']);
  });

  it('ajoute le domaine vers lequel picsum.photos redirige', () => {
    expect(imageOrigins(['https://picsum.photos/seed/room-01/800/600'])).toEqual([
      'https://picsum.photos',
      'https://fastly.picsum.photos',
    ]);
  });

  it('ignore les valeurs vides ou invalides', () => {
    expect(
      imageOrigins([null, undefined, '', 'pas une adresse', 'data:image/png;base64,AA']),
    ).toEqual([]);
  });

  it('se limite à quatre origines', () => {
    const urls = ['a', 'b', 'c', 'd', 'e'].map((host) => `https://${host}.example/x.jpg`);
    expect(imageOrigins(urls)).toHaveLength(4);
  });
});
