import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageTransition } from './image-transition';

describe('ImageTransition', () => {
  let component: ImageTransition;
  let fixture: ComponentFixture<ImageTransition>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageTransition]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageTransition);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
