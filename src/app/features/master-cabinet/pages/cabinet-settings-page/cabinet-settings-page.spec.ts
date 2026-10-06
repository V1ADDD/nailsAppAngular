import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { type AccountSnapshot } from '@app/core/data/api';
import { type Master } from '@app/core/data/models';
import { SessionStore } from '@app/core/session/session.store';
import { SupportService } from '@app/core/support/support.service';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { CabinetStore, type Done } from '../../state/cabinet.store';
import { CabinetSettingsPage } from './cabinet-settings-page';

describe('CabinetSettingsPage', () => {
  let fixture: ComponentFixture<CabinetSettingsPage>;
  const master = signal<Master | null>(null);
  const snapshot = { account: {}, client: {}, master: null } as unknown as AccountSnapshot;
  const store = {
    master,
    saving: signal(false),
    updateProfile: jest.fn(),
    deleteMasterProfile: jest.fn(),
  };
  const session = { setSnapshot: jest.fn(), snapshot: jest.fn(() => null) };
  const toast = { success: jest.fn(), error: jest.fn() };
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    jest.clearAllMocks();
    // jsdom has no <dialog> methods.
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
    master.set({
      id: 'm1',
      autoConfirm: { enabled: false, afterMinutes: 30 },
    } as unknown as Master);
    store.saving.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CabinetStore, useValue: store },
        { provide: SessionStore, useValue: session },
        { provide: ToastService, useValue: toast },
      ],
    });
    fixture = TestBed.createComponent(CabinetSettingsPage);
    await fixture.whenStable();
  });

  const button = (re: RegExp) =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      re.test(b.textContent ?? ''),
    )!;

  async function openDelete() {
    button(/Удалить профиль мастера/).click();
    await fixture.whenStable();
  }

  async function type(value: string) {
    const input = el().querySelector<HTMLInputElement>('input[name=confirm]')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  const submit = () => el().querySelector('form')!.dispatchEvent(new Event('submit'));

  it('calls updateProfile with autoConfirm when the toggle changes', () => {
    const toggle = el().querySelector<HTMLInputElement>('input[role=switch]')!;
    expect(toggle.checked).toBe(false);
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    expect(store.updateProfile).toHaveBeenCalledWith(
      { autoConfirm: { enabled: true, afterMinutes: 30 } },
      expect.any(Object),
    );
  });

  it('shows the delay select only when auto-confirm is on', async () => {
    expect(el().querySelector('select')).toBeNull();
    master.set({ id: 'm1', autoConfirm: { enabled: true, afterMinutes: 60 } } as unknown as Master);
    await fixture.whenStable();
    expect(el().querySelector('select')).not.toBeNull();
  });

  it('opens the support sheet from «Служба поддержки»', () => {
    button(/Служба поддержки/).click();
    expect(TestBed.inject(SupportService).isOpen()).toBe(true);
  });

  it('keeps the delete button disabled until «УДАЛИТЬ» is typed', async () => {
    await openDelete();
    const confirm = button(/Удалить навсегда/);
    expect(confirm.disabled).toBe(true);
    await type('удал');
    expect(confirm.disabled).toBe(true);
    await type('УДАЛИТЬ');
    expect(confirm.disabled).toBe(false);
  });

  it('does not delete when the word does not match', async () => {
    await openDelete();
    await type('нет');
    submit();
    expect(store.deleteMasterProfile).not.toHaveBeenCalled();
  });

  it('disables the delete button while saving', async () => {
    await openDelete();
    await type('УДАЛИТЬ');
    store.saving.set(true);
    await fixture.whenStable();
    expect(button(/Удалить навсегда/).disabled).toBe(true);
  });

  it('deletes the profile, updates the session and goes to the client account', async () => {
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    store.deleteMasterProfile.mockImplementation((done: Done<AccountSnapshot>) =>
      done.onSuccess?.(snapshot),
    );
    await openDelete();
    await type('удалить');
    submit();
    expect(store.deleteMasterProfile).toHaveBeenCalledTimes(1);
    expect(session.setSnapshot).toHaveBeenCalledWith(snapshot);
    expect(navigate).toHaveBeenCalledWith(['/profile/client']);
    expect(toast.success).toHaveBeenCalledWith('Профиль мастера удалён');
  });

  it('shows an error toast and stays when deletion fails', async () => {
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    store.deleteMasterProfile.mockImplementation((done: Done<AccountSnapshot>) =>
      done.onError?.('Сервис недоступен'),
    );
    await openDelete();
    await type('УДАЛИТЬ');
    submit();
    expect(toast.error).toHaveBeenCalledWith('Сервис недоступен');
    expect(navigate).not.toHaveBeenCalled();
  });
});
