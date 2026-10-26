import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CompanyImpact } from './company-impact';

describe('CompanyImpact', () => {
  let component: CompanyImpact;
  let fixture: ComponentFixture<CompanyImpact>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompanyImpact],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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
