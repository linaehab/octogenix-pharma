import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeadershipSection } from './leadership-section';

describe('LeadershipSection', () => {
  let component: LeadershipSection;
  let fixture: ComponentFixture<LeadershipSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeadershipSection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeadershipSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
