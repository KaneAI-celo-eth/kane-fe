import { parseAbi, toFunctionSelector } from "viem";

// Aave V3 Pool — only the two static-head-recipient selectors the executor allowlists.
// `supply.onBehalfOf` and `withdraw.to` are both the 3rd arg (0-based word index 2),
// which is why the authorize flow binds them with recipientWordIndex = 2.
export const aavePoolAbi = parseAbi([
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
  "function withdraw(address asset, uint256 amount, address to) returns (uint256)",
]);

// ProtocolDataProvider — resolves the aToken (aUSDC) for a reserve on demand, so the
// console never hardcodes an aToken address it can't verify from a primary source.
export const aaveDataProviderAbi = parseAbi([
  "function getReserveTokensAddresses(address asset) view returns (address aToken, address stableDebtToken, address variableDebtToken)",
]);

/** Aave V3 `supply(address,uint256,address,uint16)` selector. */
export const AAVE_SUPPLY_SELECTOR = toFunctionSelector(
  "function supply(address,uint256,address,uint16)",
);
/** Aave V3 `withdraw(address,uint256,address)` selector. */
export const AAVE_WITHDRAW_SELECTOR = toFunctionSelector(
  "function withdraw(address,uint256,address)",
);
