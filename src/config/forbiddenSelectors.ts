import { toFunctionSelector, type Hex } from "viem";

/**
 * The canonical `calls` selector denylist — ERC-20/NFT transfer-, allowance-, and
 * authorization-moving selectors an executor owner seeds via
 * `setForbiddenSelectors(standardForbiddenSelectors(), true)`.
 *
 * Mirrors kane-sc `script/SetupExecutor.s.sol:standardForbiddenSelectors()` (15 entries).
 * A denylist can never be exhaustive — the primary rule is that `calls` targets are
 * PROTOCOLS, not token/NFT contracts. This is the backstop for allowlisting a token by mistake.
 */
export function standardForbiddenSelectors(): Hex[] {
  return [
    "function transfer(address,uint256)",
    "function transferFrom(address,address,uint256)",
    "function approve(address,uint256)",
    "function increaseAllowance(address,uint256)",
    "function decreaseAllowance(address,uint256)",
    "function permit(address,address,uint256,uint256,uint8,bytes32,bytes32)",
    // EIP-3009 (USDC/USDT on Celo support it)
    "function transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)",
    "function receiveWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)",
    // NFT operator approval + transfer/approve-equivalents that bypass ERC-20 selectors
    "function setApprovalForAll(address,bool)",
    "function send(address,uint256,bytes)",
    "function transferAndCall(address,uint256)",
    "function transferAndCall(address,uint256,bytes)",
    "function transferFromAndCall(address,address,uint256)",
    "function approveAndCall(address,uint256)",
    "function approveAndCall(address,uint256,bytes)",
  ].map((sig) => toFunctionSelector(sig));
}
