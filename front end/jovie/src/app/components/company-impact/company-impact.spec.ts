import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyImpact } from './company-impact';

describe('CompanyImpact', () => {
  let component: CompanyImpact;
  let fixture: ComponentFixture<CompanyImpact>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyImpact]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompanyImpact);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
