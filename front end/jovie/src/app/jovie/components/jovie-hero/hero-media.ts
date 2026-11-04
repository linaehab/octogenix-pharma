/**
 * Media of the Jovie hero: a muted loop from the Jovie brand movie (src/assets/jovie assets/
 * BrandMovie 1minuut.mp4, 0:27–0:46.9, ending on a scene cut so the loop restarts cleanly).
 * Encoded H.264 1920 × 1080 without audio (~2.9 MB); the poster is its first frame. With `video`
 * set to null the poster image is shown in the video's place.
 */
export const HERO_MEDIA: { video: string | null; videoWebm: string | null; poster: string } = {
  video: '/assets/images/jovie/hero-brand.mp4',
  videoWebm: null,
  poster: '/assets/images/jovie/hero-brand-poster.jpg',
};
