import { TestBed } from '@angular/core/testing';
import { FeedingFilm } from './feeding-film';

describe('FeedingFilm', () => {
  const render = () => {
    const fixture = TestBed.createComponent(FeedingFilm);
    fixture.detectChanges();
    return fixture;
  };

  it('shows the Jovie process animation muted, looped and inline, with its poster', () => {
    const el = render().nativeElement as HTMLElement;
    const video = el.querySelector('video')!;
    expect(video.querySelector('source')!.getAttribute('src')).toBe('/assets/images/jovie/feeding-guide-process.mp4');
    expect(video.getAttribute('poster')).toBe('/assets/images/jovie/feeding-guide-process-poster.jpg');
    expect(video.muted).toBeTrue();
    expect(video.loop).toBeTrue();
    expect(video.hasAttribute('playsinline')).toBeTrue();
    expect(el.querySelectorAll('app-decor-shape').length).toBe(4);
  });

  it('turns the sound on and off from its button', () => {
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;
    const video = el.querySelector('video')!;
    spyOn(video, 'play').and.returnValue(Promise.resolve());
    const sound = el.querySelectorAll<HTMLButtonElement>('.control')[1];
    expect(sound.getAttribute('aria-pressed')).toBe('false');

    sound.click();
    fixture.detectChanges();
    expect(video.muted).toBeFalse();
    expect(sound.getAttribute('aria-pressed')).toBe('true');

    sound.click();
    fixture.detectChanges();
    expect(video.muted).toBeTrue();
  });

  it('plays and pauses from its button', () => {
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;
    const video = el.querySelector('video')!;
    const play = spyOn(video, 'play').and.returnValue(Promise.resolve());
    el.querySelector<HTMLButtonElement>('.control')!.click();
    expect(play).toHaveBeenCalled();
  });
});
