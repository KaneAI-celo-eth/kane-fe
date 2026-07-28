import { toDataSuffix } from "@celo/attribution-tags";
import type { Hex } from "viem";

/** KaneAI's registered attribution tag (public, fixed). Rides on every write tx (ERC-8021). */
export const ATTRIBUTION_TAG = "celo_ac1c160afeb3";

/** Pass as wagmi `writeContract({ ..., dataSuffix })`. */
export const attributionSuffix = toDataSuffix(ATTRIBUTION_TAG) as Hex;
