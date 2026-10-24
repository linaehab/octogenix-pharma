import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HeroSection } from './hero-section';

describe('HeroSection', () => {
  let component: HeroSection;
  let fixture: ComponentFixture<HeroSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroSection],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should move to a selected slide and auto-advance', fakeAsync(() => {
    (component as any).selectSlide(2);
    fixture.detectChanges();
    expect((component as any).activeIndex()).toBe(2);

    tick(5000);
    fixture.detectChanges();
    expect((component as any).activeIndex()).toBe(3);
  }));
});
