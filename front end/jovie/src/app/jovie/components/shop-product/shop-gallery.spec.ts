import { TestBed } from '@angular/core/testing';
import { GalleryImage, ShopGallery } from './shop-gallery';

describe('ShopGallery', () => {
  const photos = (n: number): GalleryImage[] =>
    Array.from({ length: n }, (_, i) => ({
      src: `/p${i}.webp`,
      zoom: `/p${i}-zoom.webp`,
      alt: `Photo ${i}`,
      wide: { src: `/p${i}-wide.webp`, zoom: `/p${i}-wide-zoom.webp` },
    }));

  const render = (images: GalleryImage[]) => {
    const fixture = TestBed.createComponent(ShopGallery);
    fixture.componentRef.setInput('images', images);
    fixture.componentRef.setInput('zoomLabel', 'Zoom');
    fixture.detectChanges();
    const tiles = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.tile'));
    return {
      sizes: tiles.map((tile) => tile.className.replace('tile tile--', '')),
      srcs: tiles.map((tile) => tile.querySelector('img')!.getAttribute('src')),
    };
  };

  it('shows four photos as a large square beside two small ones, then the last one wide (never a big square)', () => {
    const { sizes, srcs } = render(photos(4));

    expect(sizes).toEqual(['big', 'small', 'small', 'wide']);
    expect(srcs).toEqual(['/p0.webp', '/p1.webp', '/p2.webp', '/p3-wide.webp']);
  });

  it('never repeats a photo or leaves an empty cell', () => {
    expect(render(photos(3)).sizes).toEqual(['big', 'small', 'small']);
    expect(render(photos(5)).sizes).toEqual(['big', 'small', 'small', 'half', 'half']);
    expect(render(photos(6)).sizes).toEqual(['big', 'small', 'small', 'big', 'small', 'small']);
    expect(render(photos(2)).sizes).toEqual(['half', 'half']);
    expect(render(photos(5)).srcs).toEqual(['/p0.webp', '/p1.webp', '/p2.webp', '/p3.webp', '/p4.webp']);
  });

  it('uses the square photo when a wide copy is missing', () => {
    expect(render([{ src: '/a.webp', alt: 'A' }]).srcs).toEqual(['/a.webp']);
  });
});
