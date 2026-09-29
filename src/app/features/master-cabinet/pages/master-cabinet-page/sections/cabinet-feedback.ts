import { inject } from '@angular/core';
import { type Master } from '@app/core/data/models';
import { SessionStore } from '@app/core/session/session.store';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { type Done } from '../../../state/cabinet.store';

/**
 * Callbacks for store mutations: toast on success / error, and keep the session's master
 * (header avatar, public card) in sync with what CabinetApi returned.
 */
export function injectCabinetFeedback() {
  const toast = inject(ToastService);
  const session = inject(SessionStore);

  const syncMaster = (master: Master) => {
    const snapshot = session.snapshot();
    if (snapshot) session.setSnapshot({ ...snapshot, master });
  };

  return {
    toast,
    done<T>(successText?: string, after?: (result: T) => void): Done<T> {
      return {
        onSuccess: (result) => {
          if (successText) toast.success(successText);
          after?.(result);
        },
        onError: (message) => toast.error(message),
      };
    },
    master(successText?: string, after?: () => void): Done<Master> {
      return {
        onSuccess: (master) => {
          syncMaster(master);
          if (successText) toast.success(successText);
          after?.();
        },
        onError: (message) => toast.error(message),
      };
    },
  };
}
