import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RouteIntro } from './route-intro';

describe('RouteIntro', () => {
  let component: RouteIntro;
  let fixture: ComponentFixture<RouteIntro>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouteIntro],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(RouteIntro);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('eyebrow', 'About');
    fixture.componentRef.setInput('title', 'Our story');
    fixture.componentRef.setInput('description', 'Learn about the company.');
    fixture.componentRef.setInput('image', '/assets/images/about-baby.jpg');
    fixture.componentRef.setInput('imageAlt', 'A company image');
    fixture.componentRef.setInput('variant', 'about');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
