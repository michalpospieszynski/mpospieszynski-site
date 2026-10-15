import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { safeReturnUrl } from '../auth/admin.guard';
import { AuthService } from '../auth/auth.service';
import { AdminPreferencesComponent } from '../shell/admin-preferences.component';

type Step = 'password' | 'mfa';
type ErrorKey = 'invalid' | 'mfa' | 'notAdmin' | 'network' | null;

/** /admin/logowanie (docs/screens/admin/02-login.md). */
@Component({
  selector: 'adm-login',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    TranslocoPipe,
    AdminPreferencesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  /** From the query string; only admin paths are honoured. */
  readonly returnUrl = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly step = signal<Step>('password');
  protected readonly busy = signal(false);
  protected readonly error = signal<ErrorKey>(null);
  protected readonly notice = this.auth.notice;

  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly code = this.fb.control('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/),
  ]);

  private readonly passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');
  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');

  constructor() {
    // Already signed in as admin: straight on.
    afterNextRender(async () => {
      if (await this.auth.isAdmin()) await this.continue();
    });
  }

  protected async signIn(): Promise<void> {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    const result = await this.auth.signIn(email, password);
    this.busy.set(false);
    if (result === 'ok') {
      await this.continue();
      return;
    }
    if (result === 'mfa') {
      this.step.set('mfa');
      setTimeout(() => this.codeInput()?.nativeElement.focus());
      return;
    }
    if (result === 'invalid') {
      this.form.controls.password.reset();
      setTimeout(() => this.passwordInput()?.nativeElement.focus());
    }
    this.error.set(result);
  }

  /** Submits by itself once six digits are in. */
  protected onCode(): void {
    if (this.code.valid) void this.verify();
  }

  protected async verify(): Promise<void> {
    if (this.code.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    const result = await this.auth.verifyMfa(this.code.value);
    this.busy.set(false);
    if (result === 'ok') {
      await this.continue();
      return;
    }
    if (result === 'notAdmin') this.step.set('password');
    this.code.reset();
    this.error.set(result === 'invalid' ? 'mfa' : result);
    setTimeout(() => this.codeInput()?.nativeElement.focus());
  }

  private async continue(): Promise<void> {
    this.notice.set(null);
    await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
  }
}
