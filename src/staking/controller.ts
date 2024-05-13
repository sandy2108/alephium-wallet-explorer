import {
  ALPH_TOKEN_ID,
  addressFromContractId,
  binToHex,
  contractIdFromAddress,
  subContractId,
} from "@alephium/web3";
import base58 from "bs58";
import { WalletExplorerTransaction, transactions } from "./transaction";

export async function getAllBalances(address: string): Promise<object[]> {
  try {
    const parentContractId = findSubContractId(address);
    return parentContractId;
  } catch (error) {
    console.error("Error fetching balances:", error);
    throw error;
  }
}

function findParentContractId() {
  const tokenPairFactoryContractId =
    "220c2e540d091dfd9cc24480e7b3fd94b7187d893dea13337ba8d1aea77c3500";
  const ayinTokenId =
    "5bf2f559ae714dab83ff36bed4d9e634dfda3ca9ed755d60f00be89e2a20bd00";
  const usdtTokenId =
    "556d9582463fe44fbd108aedc9f409f69086dc78d994b88ea6c9e65f8bf98e00";

  const alfTokenId =
    "66da610efb5129c062e88e5fd65fe810f31efd1597021b2edf887a4360fa0800";

  const pacaTokenId =
    "b2d71c116408ae47b931482a440f675dc9ea64453db24ee931dacd578cae9002";

  // To Find Pools Pairs Contract
  const alphAyinTokenPairContractId = subContractId(
    tokenPairFactoryContractId,
    ALPH_TOKEN_ID + alfTokenId,
    0
  );

  const LiquidityPoolPairContract = addressFromContractId(
    alphAyinTokenPairContractId
  );

  return LiquidityPoolPairContract;
}

const AYIN_DEX_STAKING_POOL_CONTRACT = [
  {
    parentContract: "tuuAwnJNwxew6chSHV74CW9Er18EE925Ss2fQMmZbWtF",
    LPpairId: "25ywM8iGxKpZWuGA5z6DXKGcZCXtPBmnbQyJEsjvjjWTy",
    Assets: [
      "0000000000000000000000000000000000000000000000000000000000000000",
      "vT49PY8ksoUL6NcXiZ1t2wAmC7tTPRfFfER8n3UCLvXy", //AYIN
    ],
  },
  {
    parentContract: "xoCP1VYdJXoAr6hbmm7dkJAr8e377KXXb8cZ7CZDau5Z",
    LPpairId: "2A5R8KZQ3rhKYrW7bAS4JTjY9FCFLJg6HjQpqSFZBqACX",
    Assets: [
      "0000000000000000000000000000000000000000000000000000000000000000",
      "zSRgc7goAYUgYsEBYdAzogyyeKv3ne3uvWb3VDtxnaEK", // USDT
    ],
  },
  {
    parentContract: "w7oLoY2txEBb5nzubQqrcdYaiM8NcCL9kMYXY67YfnUo",
    LPpairId: "22PUN5TpytzGRXZnzkHViRaWioiGNzdufJH1CxFyQF5Sf",
    Assets: [
      "0000000000000000000000000000000000000000000000000000000000000000",
      "21cSqJ6AgZ1sYCGX7BueqBtjGXRKKtsh7jvvE8HFGQNZ5", //ALF
    ],
  },
];

async function findSubContractId(userAddress: string) {
  const stakerAddressInHex = base58ToHex(userAddress);
  const subContractAddresses = [];

  const result = [];

  for (const contractAddress of AYIN_DEX_STAKING_POOL_CONTRACT) {
    const MastercontractId = binToHex(
      contractIdFromAddress(contractAddress.parentContract)
    );

    const address = subContractId(
      MastercontractId, // Staking contract master contract id
      await stakerAddressInHex, // Staker Address In Hex
      0
    );

    const addressFromContract = addressFromContractId(address);
    subContractAddresses.push({
      parentContractAddress: contractAddress.parentContract,
      parentSubContractAddress: addressFromContract,
      LPPairId: contractAddress.LPpairId, // Add LPPairId only once
      Assets: contractAddress.Assets,
    });
  }

  for (const info of subContractAddresses) {
    const {
      parentContractAddress,
      parentSubContractAddress,
      LPPairId,
      Assets,
    } = info;

    const StakedfilteredTransactions = stakedTransactions(
      transactions,
      parentSubContractAddress,
      LPPairId
    );
    const UnstakedfilteredTransactions = unstakedTransactions(
      transactions,
      parentContractAddress,
      LPPairId
    );

    const totalStakedAmount = StakedfilteredTransactions.reduce((acc, curr) => {
      return acc + BigInt(curr.amount ?? 0);
    }, BigInt(0));

    const totalUnStakedAmount = UnstakedfilteredTransactions.reduce(
      (acc, curr) => {
        return acc + BigInt(curr.amount ?? 0);
      },
      BigInt(0)
    );

    const stakedAmount = Math.floor(
      Number(totalStakedAmount) - Number(totalUnStakedAmount)
    );

    result.push({
      type: "LP",
      pair: LPPairId,
      staked: stakedAmount,
      assets: Assets,
    });
  }

  return result;
}

async function base58ToHex(base58Address: string): Promise<string> {
  // Decode the Base58 address
  const decodedBytes: Buffer = Buffer.from(base58.decode(base58Address));
  // Convert the decoded bytes to hexadecimal
  const hexAddress: string = decodedBytes.toString("hex");
  return hexAddress;
}

const stakedTransactions = (
  transactions: WalletExplorerTransaction[],
  parentSubContractAddress: string,
  LPpairId: string
) => {
  return transactions.filter(
    (txn) => txn.to === parentSubContractAddress && txn.contract == LPpairId
  );
};

const unstakedTransactions = (
  transactions: WalletExplorerTransaction[],
  parentContractAddress: string,
  LPPairId: string
) => {
  return transactions.filter(
    (txn) => txn.from === parentContractAddress && txn.contract == LPPairId
  );
};

const UserBalancesOUT = (transaction: WalletExplorerTransaction[]) => {
  return transactions.filter(
    (txn) =>
      txn.contract == "21cSqJ6AgZ1sYCGX7BueqBtjGXRKKtsh7jvvE8HFGQNZ5" &&
      txn.is_out == true
  );
};

const UserBalancesIN = (transaction: WalletExplorerTransaction[]) => {
  return transactions.filter(
    (txn) =>
      txn.contract == "21cSqJ6AgZ1sYCGX7BueqBtjGXRKKtsh7jvvE8HFGQNZ5" &&
      txn.is_out == false
  );
};

module.exports = {
  getAllBalances,
};
