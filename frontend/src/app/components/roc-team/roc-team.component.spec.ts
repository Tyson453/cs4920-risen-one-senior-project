import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RocTeamComponent } from './roc-team.component';

describe('RocTeamComponent', () => {
  let component: RocTeamComponent;
  let fixture: ComponentFixture<RocTeamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RocTeamComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RocTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
