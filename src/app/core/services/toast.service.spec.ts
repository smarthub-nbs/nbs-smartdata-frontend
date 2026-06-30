import { TestBed, fakeAsync, tick } from '@angular/core/testing';
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
    expect(service.items()[0]?.dismissing).toBeFalse();
    expect(service.items()[0]?.durationMs).toBeGreaterThan(0);
  });

  it('queues error toasts', () => {
    service.error('Request failed');

    expect(service.items()[0]?.variant).toBe('error');
  });

  it('dismisses a toast by id after the exit animation', fakeAsync(() => {
    service.info('Hello');
    const id = service.items()[0]?.id;
    expect(id).toBeTruthy();

    if (!id) {
      fail('Expected toast id to exist.');
      return;
    }

    service.dismiss(id);

    expect(service.items()[0]?.dismissing).toBeTrue();

    tick(180);

    expect(service.items().length).toBe(0);
  }));

  it('keeps at most three visible toasts', () => {
    service.info('One');
    service.info('Two');
    service.info('Three');
    service.info('Four');

    expect(service.items().map((toast) => toast.message)).toEqual([
      'Two',
      'Three',
      'Four',
    ]);
  });

  it('deduplicates repeated messages within the dedupe window', () => {
    service.success('Saved');
    service.success('Saved');

    expect(service.items().length).toBe(1);
  });

  it('pauses and resumes every toast as a stack', fakeAsync(() => {
    service.success('One', 4000);
    service.info('Two', 4000);

    service.pauseAll();
    tick(4000);
    expect(service.items().length).toBe(2);

    service.resumeAll();
    tick(4000);
    tick(180);
    expect(service.items().length).toBe(0);
  }));

  it('freezes auto-dismiss while the tab is hidden', fakeAsync(() => {
    service.success('Background', 2000);

    spyOnProperty(document, 'hidden', 'get').and.returnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    tick(2000);
    expect(service.items().length).toBe(1);
  }));

  it('supports structured persistent toasts', () => {
    const action = jasmine.createSpy('action');

    service.show({
      title: 'Dataset published',
      message: 'It is now visible in Discovery.',
      variant: 'success',
      persistent: true,
      action: {
        label: 'View',
        handler: action,
      },
    });

    expect(service.items()[0]).toEqual(
      jasmine.objectContaining({
        title: 'Dataset published',
        message: 'It is now visible in Discovery.',
        variant: 'success',
        action: jasmine.objectContaining({ label: 'View' }),
        durationMs: 0,
      }),
    );
  });
});
