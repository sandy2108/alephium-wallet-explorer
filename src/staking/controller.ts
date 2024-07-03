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


const AYIN_DEX_STAKING_POOL_CONTRACT = [
  {
    parentContract: "tuuAwnJNwxew6chSHV74CW9Er18EE925Ss2fQMmZbWtF",
    LPpairId: "25ywM8iGxKpZWuGA5z6DXKGcZCXtPBmnbQyJEsjvjjWTy",
    Assets: [
      "0000000000000000000000000000000000000000000000000000000000000000",
      "vT49PY8ksoUL6NcXiZ1t2wAmC7tTPRfFfER8n3UCLvXy", //AYIN
    ],
    totalSupply: 696937.3335, 
    pooledALPH: 1794031.977,
    pooledPair: 282607.266,
  },
  {
    parentContract: "xoCP1VYdJXoAr6hbmm7dkJAr8e377KXXb8cZ7CZDau5Z",
    LPpairId: "2A5R8KZQ3rhKYrW7bAS4JTjY9FCFLJg6HjQpqSFZBqACX",
    Assets: [
      "0000000000000000000000000000000000000000000000000000000000000000",
      "zSRgc7goAYUgYsEBYdAzogyyeKv3ne3uvWb3VDtxnaEK", // USDT
    ],
    totalSupply: 0.6816,
    pooledALPH: 619595.1079,
    pooledPair: 805051.9764,
  },
  {
    parentContract: "w7oLoY2txEBb5nzubQqrcdYaiM8NcCL9kMYXY67YfnUo",
    LPpairId: "22PUN5TpytzGRXZnzkHViRaWioiGNzdufJH1CxFyQF5Sf",
    Assets: [
      "0000000000000000000000000000000000000000000000000000000000000000",
      "21cSqJ6AgZ1sYCGX7BueqBtjGXRKKtsh7jvvE8HFGQNZ5", //ALF
    ],
    totalSupply: 0.404,
    pooledALPH: 5414.9322,
    pooledPair: 33141.2323,
  },

  {
    parentContract: "242tGBfUiKUfVQQE9NL7afobFzfFRaLXSYkoQv84a5Ph9",
    LPpairId: "283R192Z8n6PhXSpSciyvCsLEiiEVFkSE6MbRBA4KSaAj",
    Assets: [
      "0000000000000000000000000000000000000000000000000000000000000000",
      "22Nb9JajRpAh9A2fWNgoKt867PA6zNyi541rtoraDfKXV", //USDC
    ],
    totalSupply: 0.006,
    pooledALPH: 251341.0563,
    pooledPair: 313224.0612,
  },

];


async function base58ToHex(base58Address: string): Promise<string> {
  // Decode the Base58 address
  const decodedBytes: Buffer = Buffer.from(base58.decode(base58Address));
  // Convert the decoded bytes to hexadecimal
  const hexAddress: string = decodedBytes.toString("hex");
  return hexAddress;
}

async function calculateTokenShare(
  pooledALPH: number,
  pooledALF: number,
  totalLPTokens: number,
  yourPoolSharePercentage: number
): Promise<{ ALPH: number; PAIR: number }> {
  // Calculate your LP token share
  const yourLPShare = totalLPTokens * (yourPoolSharePercentage / 100);

  // Calculate your share of each token
  const yourALPH = yourLPShare * (pooledALPH / totalLPTokens);
  const yourALF = yourLPShare * (pooledALF / totalLPTokens);

  return { ALPH: yourALPH, PAIR: yourALF };
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

const UserBalancesOUT = (
  transactions: WalletExplorerTransaction[],
  LPPairId: string
) => {
  return transactions.filter(
    (txn) => txn.contract == LPPairId && txn.is_out == true
  );
};

const UserBalancesIN = (
  transactions: WalletExplorerTransaction[],
  LPPairId: string
) => {
  return transactions.filter(
    (txn) => txn.contract == LPPairId && txn.is_out == false
  );
};

interface AccuredRewardShape{
  staked: number;
  parentContract: string;
  subContract:string;
}

interface UserStats {
  stakedAmount: bigint;
  rewardPerTokenPaid: bigint;
  pastRewards: bigint;
}


async function calculateAccuredRewards({
  staked,
  parentContract,
  subContract,
}: AccuredRewardShape): Promise<bigint> {
  const currentRewardPerTokens = await calculateTokenPerRewards(parentContract);
  const { rewardPerTokenPaid, pastRewards } = await calculateUserRewardPerTokenPaid(subContract);

  const earnedRewards =  (BigInt(staked) * (currentRewardPerTokens - rewardPerTokenPaid)) / BigInt(10) ** BigInt(18)+ pastRewards;
  return earnedRewards;
}

async function calculateUserRewardPerTokenPaid(subContract: string): Promise<UserStats> {
  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(`https://sigmanode.ayin.app/contracts/${subContract}/state?group=0`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const { mutFields } = data;


      const stakedAmount = BigInt(mutFields[0].value); //optional we can either get this from historical transaction or from node
      const rewardPerTokenPaid = BigInt(mutFields[1].value);
      const pastRewards = BigInt(mutFields[2].value);
    

      return { stakedAmount , rewardPerTokenPaid, pastRewards };
    } catch (error) {
      attempt++;
      console.error(`Error fetching or parsing data (attempt ${attempt}):`, error);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw new Error('Failed to fetch data after maximum retries');
      }
    }
  }
  throw new Error('Failed to fetch data after maximum retries');
}



async function calculateTokenPerRewards(parentContract: string): Promise<bigint> {
  const maxRetries = 5; // Maximum number of retries
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(`https://sigmanode.ayin.app/contracts/${parentContract}/state?group=0`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      const { mutFields } = data;

      const rewardRate = BigInt(mutFields[0].value) 
      const totalAmountStaked = BigInt(mutFields[1].value)
      const rewardPerTokenStored = BigInt(mutFields[2].value)
      const lastUpdateTime = BigInt(mutFields[3].value) 

      const currentUpdatedTime = BigInt(Date.now()); 

      const rewardPerToken = rewardPerTokenStored + ((currentUpdatedTime - lastUpdateTime) * rewardRate * (BigInt(10) ** BigInt(18))) / totalAmountStaked

      

      return rewardPerToken;
    } catch (error) {
      attempt++;
      console.error(`Error fetching or parsing data (attempt ${attempt}):`, error);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 100 + Math.random() * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw new Error('Failed to fetch data after maximum retries');
      }
    }
  }
  return BigInt(0);
}




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
      totalSupply: contractAddress.totalSupply,
      pooledALPH: contractAddress.pooledALPH,
      pooledPair: contractAddress.pooledPair,
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

    const UserBalancesOUTTransactions = UserBalancesOUT(transactions, LPPairId);
    const UserBalancesINTransactions = UserBalancesIN(transactions, LPPairId);

    const OutAmount = UserBalancesOUTTransactions.reduce((acc, curr) => {
      return acc + BigInt(curr.amount ?? 0);
    }, BigInt(0));

    const InAmount = UserBalancesINTransactions.reduce((acc, curr) => {
      return acc + BigInt(curr.amount ?? 0);
    }, BigInt(0));

    const UserBalance = Math.floor(Number(InAmount) - Number(OutAmount));

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

    const stakedAmountInDecimal = (stakedAmount / 10 ** 18).toFixed(18);
    const balanceInDecimal = (UserBalance / 10 ** 18).toFixed(18);

    const userReservePercentage =
      (Number(stakedAmountInDecimal) / info.totalSupply) * 100;

    const { ALPH, PAIR } = await calculateTokenShare(
      info.pooledALPH,
      info.pooledPair,
      info.totalSupply,
      userReservePercentage
    );

    let accuredRewards = BigInt(0);

    if(Number(stakedAmountInDecimal) !== 0){

     accuredRewards = await calculateAccuredRewards({
                staked: Number(stakedAmount),
                parentContract: parentContractAddress,
                subContract: parentSubContractAddress
              });
    }

    const stakingrewards = Number(accuredRewards) / 10 ** 18
    
    result.push({
      type: "LP",
      pair: LPPairId,
      staked: stakedAmountInDecimal,
      accuredRewards: stakingrewards,
      balance: balanceInDecimal,
      userReservePercentage: userReservePercentage,
      StakedAssets: { ALPH: ALPH, PAIR: PAIR },
      assets: Assets,
    });
  }

  return result;
}


module.exports = {
  getAllBalances,
};





