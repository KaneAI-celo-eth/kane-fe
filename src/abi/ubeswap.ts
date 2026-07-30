import { parseAbi, toFunctionSelector } from "viem";

// Ubeswap V2 (Uniswap-V2 fork) router — only the swap the executor allowlists. `to` is the 4th arg
// (0-based head word index 3), a static head word even though `path` is dynamic, so the executor
// binds the recipient to the owner (recipientWordIndex = 3).
export const ubeswapRouterAbi = parseAbi([
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
]);

/** Ubeswap V2 `swapExactTokensForTokens(uint256,uint256,address[],address,uint256)` selector. */
export const UBESWAP_SWAP_SELECTOR = toFunctionSelector(
  "function swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
);
