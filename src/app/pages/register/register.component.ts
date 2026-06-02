import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  name = '';
  email = '';
  password = '';
  message = '';

  async register(): Promise<void> {
    this.message = 'Creando cuenta...';

    if (!this.email.trim() || !this.password.trim()) {
      this.message = 'Escribe correo y contraseña.';
      return;
    }

    if (this.password.length < 6) {
      this.message = 'La contraseña debe tener mínimo 6 caracteres.';
      return;
    }

    try {
      await this.authService.register(
        this.name.trim(),
        this.email.trim().toLowerCase(),
        this.password
      );

      await this.router.navigateByUrl('/verificar-codigo');
    } catch (error: any) {
      console.error('Error al crear cuenta:', error);

      if (error?.code === 'auth/email-already-in-use') {
        this.message = 'Este correo ya está registrado. Inicia sesión o usa Google.';
        return;
      }

      if (error?.code === 'auth/invalid-email') {
        this.message = 'El correo electrónico no es válido.';
        return;
      }

      if (error?.code === 'auth/weak-password') {
        this.message = 'La contraseña debe tener mínimo 6 caracteres.';
        return;
      }

      if (error?.error?.error) {
        this.message = error.error.error;
        return;
      }

      if (error?.message) {
        this.message = error.message;
        return;
      }

      this.message = 'No se pudo crear la cuenta. Verifica los datos.';
    }
  }
}
