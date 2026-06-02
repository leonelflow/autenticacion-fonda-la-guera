import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  message = '';

  async ngOnInit(): Promise<void> {
    try {
      await this.authService.handleGoogleRedirect();
    } catch (error: any) {
      if (error?.error?.error) {
        this.message = error.error.error;
      }
    }
  }

  async login(): Promise<void> {
    this.message = 'Validando acceso...';
    try {
      await this.authService.login(this.email.trim(), this.password);
      await this.router.navigateByUrl('/verificar-codigo');
    } catch (error: any) {
      console.error('Error con correo:', error);
      if (error?.code) {
        this.message = `Error Firebase: ${error.code}`;
        return;
      }
      if (error?.error?.error) {
        this.message = error.error.error;
        return;
      }
      this.message = 'Correo o contraseña incorrectos.';
    }
  }

  async loginWithGoogle(): Promise<void> {
    this.message = 'Redirigiendo a Google...';
    try {
      await this.authService.loginWithGoogle();
    } catch (error: any) {
      console.error('Error con Google:', error);
      if (error?.code) {
        this.message = `Error Firebase: ${error.code}`;
        return;
      }
      this.message = 'No se pudo iniciar sesión con Google.';
    }
  }
}