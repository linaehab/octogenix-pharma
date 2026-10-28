/**
 * Media of the Jovie hero. Until the parent company supplies the hero video, `video` stays null and
 * the poster image is shown in the video's place.
 *
 * Requested video: MP4 (H.264), 1920 × 1080 (16:9), 10–20 s seamless loop, no sound needed,
 * at most ~8 MB, main subject kept in the centre-right 1440 × 1080 area (the curved frame crops
 * the left edge and the sides on smaller screens). A WebM (VP9) copy and a 1920 × 1080 poster
 * frame (JPG) are welcome. Put the files in src/assets/images/jovie/ and set the paths below.
 */
export const HERO_MEDIA: { video: string | null; videoWebm: string | null; poster: string } = {
  video: null,
  videoWebm: null,
  poster: '/assets/images/jovie/hero-mother-baby.jpg',
};
