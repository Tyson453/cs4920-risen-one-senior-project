import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CertificationTrainingComponent } from './certification-training.component';

describe('CertificationTrainingComponent', () => {
  let component: CertificationTrainingComponent;
  let fixture: ComponentFixture<CertificationTrainingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CertificationTrainingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CertificationTrainingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
