import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataTableComponent } from '@shared/ui/data-table/data-table.component';
import { DataTableColumn } from '@shared/ui/models/data-table-column.model';

interface TestRow {
  name: string;
}

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<DataTableComponent<TestRow>>;
  let component: DataTableComponent<TestRow>;

  const columns: DataTableColumn<TestRow>[] = [{ key: 'name', header: 'Name' }];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DataTableComponent<TestRow>);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('columns', columns);
    fixture.detectChanges();
  });

  it('renders empty message when no rows', () => {
    fixture.componentRef.setInput('data', []);
    fixture.componentRef.setInput('emptyMessage', 'Nothing here');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Nothing here');
  });

  it('renders error alert when error input is set', () => {
    fixture.componentRef.setInput('data', []);
    fixture.componentRef.setInput('error', 'Failed to load');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Failed to load');
  });
});
