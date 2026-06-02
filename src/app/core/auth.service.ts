import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  inMemoryPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import { catchError, firstValueFrom, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { SessionUser } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly api = environment.apiUrl;

  private readonly firebaseApp = initializeApp(environment.firebase);
  private readonly auth = getAuth(this.firebaseApp);

  async login(email: string, password: string): Promise<void> {
    await setPersistence(this.auth, inMemoryPersistence);
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    const idToken = await credential.user.getIdToken();
    await this.startTwoFactor(idToken);
    await signOut(this.auth);
  }

  async loginWithGoogle(): Promise<void> {
    await setPersistence(this.auth, inMemoryPersistence);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(this.auth, provider);
    const idToken = await credential.user.getIdToken();
    await this.startTwoFactor(idToken);
    await signOut(this.auth);
  }

  async register(name: string, email: string, password: string): Promise<void> {
    await setPersistence(this.auth, inMemoryPersistence);
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    if (name.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }
    const idToken = await credential.user.getIdToken();
    await this.startTwoFactor(idToken);
    await signOut(this.auth);
  }

  async verifyAccessCode(code: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.api}/api/verifyAccessCode`, { code }, { withCredentials: true })
    );
  }

  async me(): Promise<SessionUser | null> {
    return await firstValueFrom(
      this.http.get<SessionUser>(`${this.api}/api/me`, { withCredentials: true }).pipe(
        catchError(() => of(null))
      )
    );
  }

  async logout(): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.api}/api/sessionLogout`, {}, { withCredentials: true })
    );
    await this.router.navigateByUrl('/login');
  }

  private async startTwoFactor(idToken: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.api}/api/sessionLogin`, { idToken }, { withCredentials: true })
    );
  }
}