type Token = {
  tokenId: string;
  balance: number;
  lockedBalance: string;
};

type NativeToken = {
  balance: number;
  lockedBalance: string;
};

type Transaction = {
  filter(arg0: (tx: any) => any): unknown;
  hash: string;
  blockHash: string;
  block_number: number;
  timestamp: number;
  inputs?: {
    outputRef?: {
      hint?: number;
      key?: string;
    };
    unlockScript?: string;
    txHashRef?: string;
    address?: string;
    attoAlphAmount?: string;
    tokens: {
      id?: string;
      amount?: string;
    }[];
  }[];
  outputs?: {
    type: string;
    hint: number;
    key: string;
    attoAlphAmount: string;
    address: string;
    tokens: {
      id: string;
      amount: string;
    }[];
    lockTime: number;
    message: string;
  }[];
  gasAmount: number;
  gasPrice: string;
  scriptExecutionOk: boolean;
  coinbase: boolean;
};

const LIQUIDITY_TOKEN_CONTRACTS = [
  "72633f106d27b1f1e1e40aaae262a4315c6af729685eb8564610865b29101c00", //AlphAyin
  "e4a0a07be5f42446732a63fcda5aa455a608909cc09a8ab66147d0379bbed700", //AlphUsdt
  "697c94ffde46634c7fe1a72098b47e2572cc8bde595efe3df0a91652bf9a0000", //AlphNGU
  "a7ca90b2af892713ed95f23b37a6db00c0650c16bad1ccc601443e9020f89f00", //AlphAyin
];

const AYIN_DEX_STAKING_POOL_CONTRACT = [
  "tuuAwnJNwxew6chSHV74CW9Er18EE925Ss2fQMmZbWtF",
  "xoCP1VYdJXoAr6hbmm7dkJAr8e377KXXb8cZ7CZDau5Z",
  "w7oLoY2txEBb5nzubQqrcdYaiM8NcCL9kMYXY67YfnUo",
];

async function getNativeTokenBalance(address: string): Promise<NativeToken[]> {
  const endpoint = `https://backend.mainnet.alephium.org/addresses/${address}/balance`;

  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

async function getTokensBalance(address: string): Promise<Token[]> {
  const endpoint = `https://backend.mainnet.alephium.org/addresses/${address}/tokens-balance`;
  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
}

async function getTokenBalance(address: string): Promise<Token[]> {
  let txns = [];
  // Get transactions for each Liquidity pairs token
  const tokenIds = LIQUIDITY_TOKEN_CONTRACTS.map((token: string) =>
    getTokenIdTransaction(address, token)
  );

  // Await all promises
  let tokenTransactions: string[] = (await Promise.all(tokenIds)).flat();
  tokenTransactions.unshift(address);
  console.log(tokenTransactions);
  // Add the address to the list of transactions (if needed

  for (const token of tokenTransactions) {
    const response = await getTokensBalance(token);
    txns.push(response);
  }

  // Now you have transactions for each token, you can combine them with filteredTokens if needed
  return txns.flat();
}

async function getTokenIdTransaction(
  address: string,
  tokenId: string
): Promise<string[]> {
  const endpoint = `https://backend.mainnet.alephium.org/addresses/${address}/tokens/${tokenId}/transactions`;
  const response = await fetch(endpoint);
  const data = await response.json();
  console.log(data);

  const result = await getSubContractFromTransactions(data);
  return result;
}

async function getSubContractFromTransactions(
  transaction: Transaction[]
): Promise<string[]> {
  // Assuming that the subContract is the output message
  const length = transaction.length || 0;
  const uniqueContracts = new Set<string>();

  let i = length - 1; // Initialize 'i' outside of the loop
  for (let i = length - 1; i >= 0; i--) {
    const trans = transaction[i];
    const inputHint = trans.inputs?.[0].outputRef?.hint;

    for (const output of trans.outputs || []) {
      if (output.hint !== inputHint && output.type == "ContractOutput") {
        const subContract = await getParentContractFromSubContract(
          output.address
        );
        if (subContract !== null) {
          // Filter out null values before adding to the set
          uniqueContracts.add(subContract);
        }
      }
    }
  }

  return [...uniqueContracts];
}

async function getParentContractFromSubContract(
  address: string
): Promise<string | null> {
  const endpoint = `https://backend.mainnet.alephium.org/contracts/${address}/parent`;
  const response = await fetch(endpoint);
  const data = await response.json();

  const parentContract = isStakingPoolContract(data?.parent);
  if ((await parentContract) === true) {
    return address;
  }
  return null;
}

async function isStakingPoolContract(subContract: string): Promise<boolean> {
  return AYIN_DEX_STAKING_POOL_CONTRACT.includes(subContract);
}

export async function getAllBalances(
  address: string
): Promise<(NativeToken[] | Token[][])[]> {
  try {
    // Fetch native token balance
    const nativeTokenBalancePromise = getNativeTokenBalance(address);
    // Fetch token balances
    const tokenBalancesPromise = getTokenBalance(address);

    // Await both promises
    const [nativeTokenBalance, tokenBalances] = await Promise.all([
      nativeTokenBalancePromise,
      tokenBalancesPromise,
    ]);

    // Return merged data as a single array
    return [nativeTokenBalance, tokenBalances];
  } catch (error) {
    console.error("Error fetching balances:", error);
    throw error;
  }
}

module.exports = {
  getAllBalances,
};
