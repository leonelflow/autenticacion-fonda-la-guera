import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Order, OrderPayload } from './models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  createOrder(payload: OrderPayload) {
    return this.http.post<{ id: string; status: string; total: number }>(
      '/api/orders',
      payload,
      { withCredentials: true }
    );
  }

  getOrders() {
    return this.http.get<{ orders: Order[] }>('/api/orders', {
      withCredentials: true
    });
  }

  updateStatus(id: string, status: string) {
    return this.http.patch<{ status: string }>(
      `/api/orders/${id}/status`,
      { status },
      { withCredentials: true }
    );
  }
}
