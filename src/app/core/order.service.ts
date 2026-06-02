import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Order, OrderPayload } from './models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  createOrder(payload: OrderPayload) {
    return this.http.post<{ id: string; status: string; total: number }>(
      `${this.api}/api/orders`,
      payload,
      { withCredentials: true }
    );
  }

  getOrders() {
    return this.http.get<{ orders: Order[] }>(`${this.api}/api/orders`, {
      withCredentials: true
    });
  }

  updateStatus(id: string, status: string) {
    return this.http.patch<{ status: string }>(
      `${this.api}/api/orders/${id}/status`,
      { status },
      { withCredentials: true }
    );
  }
}