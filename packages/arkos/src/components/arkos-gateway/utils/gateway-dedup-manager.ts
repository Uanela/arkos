import {
  ArkosDeduplicationStore,
  ArkosEmitOptions,
  ArkosGatewayConfig,
} from "../types";
import { memoryDedupStore } from "./memory-dedup-store";

class GatewayDedupManager {
  async checkAndMarkDuplicate(
    eventType: string,
    messageId: string,
    options: ArkosEmitOptions["dedup"] & { gatewayConfig: ArkosGatewayConfig },
    globalStore?: ArkosDeduplicationStore
  ): Promise<boolean> {
    if (!options?.enabled) return false;

    const store =
      options.gatewayConfig.dedup?.store ?? globalStore ?? memoryDedupStore;
    const ttl = options.ttl ?? 3600;
    const key = `arkos::dedup:${eventType}:${messageId}`;

    const isDuplicate = await store.has(key);
    if (isDuplicate) return true;

    await store.set(key, ttl);
    return false;
  }
}

const gatewayDedupManager = new GatewayDedupManager();

export default gatewayDedupManager;
