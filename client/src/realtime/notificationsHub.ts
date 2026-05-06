import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { API_BASE, tokenStorage } from '../api/client';

export interface ApplicationChangedEvent {
  id: string;
  kind: 'created' | 'updated' | 'deleted';
}

const hubUrl = (): string => {
  const base = API_BASE || ''; // empty → same origin (nginx will proxy)
  return `${base}/hubs/notifications`;
};

export function buildConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(hubUrl(), {
      // The browser can't set Authorization on WebSocket upgrades — pass the
      // JWT in the query string. The API picks it up via JwtBearerEvents.OnMessageReceived.
      accessTokenFactory: () => tokenStorage.get() ?? ''
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();
}

export async function startWithRetry(connection: HubConnection): Promise<void> {
  if (connection.state !== HubConnectionState.Disconnected) return;
  try {
    await connection.start();
  } catch (err) {
    console.warn('SignalR start failed, will retry on next attempt:', err);
  }
}
