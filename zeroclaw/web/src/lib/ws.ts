import type { WsMessage } from '../types/api';
import { getToken } from './auth';

export type WsMessageHandler = (msg: WsMessage) => void;
export type WsOpenHandler = () => void;
export type WsCloseHandler = (ev: CloseEvent) => void;
export type WsErrorHandler = (ev: Event) => void;

export interface WebSocketClientOptions {
  /** Base URL override. Defaults to current host with ws(s) protocol. */
  baseUrl?: string;
  /** Delay in ms before attempting reconnect. Doubles on each failure up to maxReconnectDelay. */
  reconnectDelay?: number;
  /** Maximum reconnect delay in ms. */
  maxReconnectDelay?: number;
  /** Set to false to disable auto-reconnect. Default true. */
  autoReconnect?: boolean;
}

const DEFAULT_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private currentDelay: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;
  /** Incremented on every connect() call. Handlers ignore messages from old generations. */
  private generation = 0;

  public onMessage: WsMessageHandler | null = null;
  public onOpen: WsOpenHandler | null = null;
  public onClose: WsCloseHandler | null = null;
  public onError: WsErrorHandler | null = null;

  private readonly baseUrl: string;
  private readonly reconnectDelay: number;
  private readonly maxReconnectDelay: number;
  private readonly autoReconnect: boolean;

  constructor(options: WebSocketClientOptions = {}) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.baseUrl =
      options.baseUrl ?? `${protocol}//${window.location.host}`;
    this.reconnectDelay = options.reconnectDelay ?? DEFAULT_RECONNECT_DELAY;
    this.maxReconnectDelay = options.maxReconnectDelay ?? MAX_RECONNECT_DELAY;
    this.autoReconnect = options.autoReconnect ?? true;
    this.currentDelay = this.reconnectDelay;
  }

  /** Open the WebSocket connection. */
  connect(): void {
    this.intentionallyClosed = false;
    this.clearReconnectTimer();

    // Null out and close any existing socket so its stale handlers can never
    // fire after this point. This prevents duplicate messages when multiple
    // containers are running and connections cycle through reconnects.
    this._destroySocket();

    const gen = ++this.generation;
    const token = getToken();
    const url = `${this.baseUrl}/ws/chat${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    const socket = new WebSocket(url);
    this.ws = socket;

    socket.onopen = () => {
      if (this.generation !== gen) return;
      this.currentDelay = this.reconnectDelay;
      this.onOpen?.();
    };

    socket.onmessage = (ev: MessageEvent) => {
      if (this.generation !== gen) return; // stale socket — discard
      try {
        const msg = JSON.parse(ev.data) as WsMessage;
        this.onMessage?.(msg);
      } catch {
        // Ignore non-JSON frames
      }
    };

    socket.onclose = (ev: CloseEvent) => {
      if (this.generation !== gen) return; // stale socket — discard
      this.onClose?.(ev);
      this.scheduleReconnect();
    };

    socket.onerror = (ev: Event) => {
      if (this.generation !== gen) return;
      this.onError?.(ev);
    };
  }

  /** Send a chat message to the agent. */
  sendMessage(content: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    this.ws.send(JSON.stringify({ type: 'message', content }));
  }

  /** Close the connection without auto-reconnecting. */
  disconnect(): void {
    this.intentionallyClosed = true;
    this.generation++; // invalidate any in-flight handlers
    this.clearReconnectTimer();
    this._destroySocket();
  }

  /** Returns true if the socket is open. */
  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Null out all handlers on the current socket and close it if still open. */
  private _destroySocket(): void {
    if (!this.ws) return;
    // Remove handlers first so no stale callbacks fire during/after close
    this.ws.onopen = null;
    this.ws.onmessage = null;
    this.ws.onclose = null;
    this.ws.onerror = null;
    if (
      this.ws.readyState !== WebSocket.CLOSED &&
      this.ws.readyState !== WebSocket.CLOSING
    ) {
      this.ws.close();
    }
    this.ws = null;
  }

  private scheduleReconnect(): void {
    if (this.intentionallyClosed || !this.autoReconnect) return;

    this.reconnectTimer = setTimeout(() => {
      this.currentDelay = Math.min(this.currentDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.currentDelay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
