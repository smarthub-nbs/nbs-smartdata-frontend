import { TestBed } from '@angular/core/testing';
import { ToastService } from '@app/core/services/toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
    service.items().forEach((toast) => service.dismiss(toast.id));
  });

  it('queues success toasts', () => {
    service.success('Saved');

    expect(service.items().length).toBe(1);
    expect(service.items()[0]?.message).toBe('Saved');
    expect(service.items()[0]?.variant).toBe('success');
  });

  it('queues error toasts', () => {
    service.error('Request failed');

    expect(service.items()[0]?.variant).toBe('error');
  });

  it('dismisses a toast by id', () => {
    service.info('Hello');
    const id = service.items()[0]?.id;
    expect(id).toBeTruthy();

    service.dismiss(id!);

    expect(service.items().length).toBe(0);
  });
});
