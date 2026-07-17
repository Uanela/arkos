export type GatewayStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

export interface ArkosEmitOptions {
  /**
   * Whether to wait for an ack from the server.
   * When true, emit returns a Promise resolving to the ack payload.
   * @default false
   */
  ack?: boolean;
  /**
   * Timeout in ms to wait for ack before retrying or rejecting.
   * Only applies when ack: true.
   * @default 5000
   */
  timeout?: number;
  /**
   * Number of retry attempts on timeout.
   * Only applies when ack: true.
   * @default 0
   */
  retries?: number;
}

export interface ArkosEmitResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  duplicate?: boolean;
}

/**
 * The _meta envelope ArkosGateway expects for dedup and maxAge.
 */
export interface ArkosMetaEnvelope {
  mid: string;
  timestamp: string;
}

export type ArkosEventHandler<T = any> = (data: T) => void;

export interface GatewayStateSubscriber {
  onStatus?: (status: GatewayStatus) => void;
  onUser?: (user: any) => void;
}

export interface GatewayEmitState {
  loading: boolean;
  error: string | null;
  lastEmittedAt: number | null;
}
