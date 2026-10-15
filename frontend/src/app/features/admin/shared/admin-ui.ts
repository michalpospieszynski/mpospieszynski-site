import { ChangeDetectionStrategy, Component, Injectable, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { ApiError } from '../../../core/http/api-error';

type HashMap = Record<string, unknown>;

export interface ConfirmData {
  message: string;
  confirm: string;
}

/** `adm-confirm-dialog`: names the item and the action (docs/screens/admin/01-admin-shell.md). */
@Component({
  selector: 'adm-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-dialog-content>
      <p class="message" data-testid="confirm-message">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">{{ 'admin.common.cancel' | transloco }}</button>
      <button mat-flat-button [mat-dialog-close]="true" data-testid="confirm" cdkFocusInitial>
        {{ data.confirm }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .message {
      margin: 0;
      max-width: 44ch;
      padding-top: var(--space-4);
    }
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmData>(MAT_DIALOG_DATA);
}

/** Feedback shared by every admin screen: snackbars, API errors, conflicts and confirmations. */
@Injectable({ providedIn: 'root' })
export class AdminUi {
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly transloco = inject(TranslocoService);

  t(key: string, params?: HashMap): string {
    return this.transloco.translate(key, params);
  }

  toast(key: string, params?: HashMap): void {
    this.snackBar.open(this.t(key, params), undefined, { duration: 3500 });
  }

  /** A message that needs reading (e.g. what is missing before publishing): stays until closed or 10 s. */
  notify(message: string): void {
    this.snackBar.open(message, this.t('admin.common.close'), { duration: 10000 });
  }

  /**
   * Shows `ProblemDetail.detail` (already Polish) in a snackbar. A stale-version 409 offers "Odśwież", which
   * calls `reload` (docs/screens/admin/01-admin-shell.md, Errors).
   */
  fail(error: unknown, reload?: () => void): void {
    const api = error instanceof ApiError ? error : null;
    if (api?.status === 401) {
      // The interceptor has signed out and is on its way to the login page.
      return;
    }
    if (api?.status === 409 && api.detail === this.t('admin.common.conflict') && reload) {
      const ref = this.snackBar.open(api.detail, this.t('admin.common.refresh'), {
        duration: 15000,
      });
      ref.onAction().subscribe(reload);
      return;
    }
    const detail =
      api?.detail || api?.title || (error instanceof Error ? error.message : String(error));
    const message =
      api?.status === 409 || api?.status === 400
        ? detail
        : this.t('admin.common.error', { detail });
    this.snackBar.open(message, this.t('admin.common.close'), { duration: 8000 });
  }

  async confirm(message: string, confirm = this.t('admin.common.delete')): Promise<boolean> {
    const ref = this.dialog.open<ConfirmDialog, ConfirmData, boolean>(ConfirmDialog, {
      data: { message, confirm },
      role: 'alertdialog',
      ariaLabel: message,
      autoFocus: 'dialog',
    });
    return (await firstValueFrom(ref.afterClosed())) === true;
  }
}

/** The API's field errors as `{ "translations.pl.title": "To pole jest wymagane." }`. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(error.errors.map((e) => [e.field, e.message]));
}
