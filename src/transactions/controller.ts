import { addressFromContractId } from "@alephium/web3";

type Block = {
  total: number;
  blocks: {
    hash: string;
    timestamp: number;
    chainFrom: number;
    chainTo: number;
    height: number;
    txNumber: number;
    mainChain: boolean;
    hashRate: string;
  }[];
};

type Transaction = {
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

type WalletExplorerTransaction = {
  hash: string;
  block_number: number;
  wallet: string;
  contract: string;
  timestamp: number;
  from: string;
  to: string;
  tx_cost?: string | null;
  amount: string;
  value_usd: number;
  method_id: string;
  is_out?: boolean;
  is_transfer?: boolean;
  fee?: number;
  is_added?: boolean;
  is_removed?: boolean;

  //from db:
  id?: number;
  portfolio_id?: number;
};

type BlockHash = {
  hash: string;
  timestamp: number;
  chainFrom: number;
  chainTo: number;
  height: number;
  txNumber: number;
  mainChain: true;
  hashRate: string;
};

const blockHashCache = new Map<string, number>();

// export async function getBlockNumber(blockHash: string) {

//     let attempts = 0;
//     let maxRetries = 5;

//     while (attempts < maxRetries) {
//         try {
//             const blockEndpoint = `https://backend.mainnet.alephium.org/blocks/${blockHash}`;
//             const response = await fetch(blockEndpoint);
//             if (!response.ok) {
//                 throw new Error(`Failed to fetch block number for block hash ${blockHash}`);
//             }
//             const data = await response.json();
//             return data.height;
//         } catch (error) {
//             attempts += 1
//             console.error(`Error fetching block number for block hash ${blockHash}:`, error);

//             if (attempts >= maxRetries) {
//                 throw error;
//             }
//             throw error;
//         }

//     }
// }

export async function getBlockNumber(blockHash: string) {
  if (blockHashCache.has(blockHash)) {
    return blockHashCache.get(blockHash);
  }

  let attempts = 0;
  let maxRetries = 5;

  while (attempts < maxRetries) {
    try {
      const blockEndpoint = `https://backend.mainnet.alephium.org/blocks/${blockHash}`;
      const response = await fetch(blockEndpoint);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch block number for block hash ${blockHash}`
        );
      }
      const data = await response.json();
      blockHashCache.set(blockHash, data.height);
      return data.height;
    } catch (error) {
      attempts += 1;
      console.error(
        `Error fetching block number for block hash ${blockHash}:`,
        error
      );

      if (attempts >= maxRetries) {
        throw error;
      }
    }
  }
}

export async function getTransactionsForAddress(
  address: string,
  page: number,
  limit: number
): Promise<WalletExplorerTransaction[]> {
  try {
    const walletTxnPoint: string = `https://backend.mainnet.alephium.org/addresses/${address}/transactions?page=${page}&limit=${limit}`;
    const response = await fetch(walletTxnPoint);
    if (!response.ok) {
      if (response.status === 400) {
        throw new Error("Bad request: Something bad in the request");
      } else if (response.status === 401) {
        throw new Error("Unauthorized");
      } else if (response.status === 404) {
        throw new Error("Not found");
      } else {
        throw new Error("Failed to fetch transactions");
      }
    }
    const data: Transaction[] = await response.json();
    const formatTxnPromises = data.map((txn: Transaction) =>
      formatTransaction(txn, address)
    );
    const formatTxn = await Promise.all(formatTxnPromises);
    return formatTxn.flat();
  } catch (error) {
    console.error("Error on Fetching Wallet Transactions:", error);
    throw error;
  }
}

export async function nativeTransfers(
  data: Transaction,
  address: string
): Promise<WalletExplorerTransaction> {
  // Calculate transaction cost
  const tx_cost = (Number(data.gasPrice) * data.gasAmount) / 10 ** 18;
  // Check if the wallet is sender
  const isOut = data.inputs?.some((input) => input.address === address);
  // Collect contract IDs from input tokens
  const contract =
    data.inputs
      ?.flatMap((input) => input.tokens?.map((token) => token.id))
      .filter(Boolean)
      .join(", ") || "";

  // Get unique 'from' addresses from inputs
  const from = Array.isArray(data.inputs)
    ? [...new Set(data.inputs.map((input) => input.address))].join(", ")
    : "";

  // Get the hint of the first input to determine the receiver
  const inputHint = data.inputs?.[0]?.outputRef?.hint;

  // Find the receiver (output with hint different from input hint)
  const receiver = data.outputs?.find((output) => output.hint !== inputHint);

  // Determine the recipient address
  const to = receiver?.address || address;

  // Get the amount received
  let amountReceived;
  if (receiver?.tokens) {
    const amount = receiver.tokens.find(
      (token) => token.id === data.inputs?.[0]?.tokens?.[0]?.id
    );
    amountReceived = amount?.amount || 0;
  } else {
    amountReceived = receiver?.attoAlphAmount || 0;
  }
  let formattedTransaction: WalletExplorerTransaction;

  // Check if the sender is different from the current wallet address
  if (from !== address) {
    // Calculate total amounts for outputs sent from the current wallet address
    let output =
      data.outputs?.filter((output) => output.address === address) ?? [];
    let amounts =
      output?.reduce(
        (total, output) => total + parseInt(output.attoAlphAmount),
        0
      ) ?? 0;
    const from = Array.isArray(data.inputs)
      ? [...new Set(data.inputs.map((input) => input.address))].join(", ")
      : "";

    formattedTransaction = {
      hash: data.hash,
      block_number: await getBlockNumber(data.blockHash), // Populate as needed
      wallet: address, // Populate as needed
      contract: contract,
      timestamp: data.timestamp,
      from: from,
      to: to,
      portfolio_id: 0,
      tx_cost: tx_cost.toString(),
      amount: String(amounts) || "0",
      value_usd: 0,
      method_id: "",
      is_out: isOut,
      is_transfer: false,
      fee: 0,
      is_added: false,
      is_removed: false,
    };
  } else {
    formattedTransaction = {
      hash: data.hash,
      block_number: await getBlockNumber(data.blockHash), // Populate as needed
      wallet: address, // Populate as needed
      contract: contract,
      timestamp: data.timestamp,
      from: from,
      to: to,
      portfolio_id: 0,
      tx_cost: tx_cost.toString(),
      amount: String(amountReceived),
      value_usd: 0,
      method_id: "",
      is_out: isOut,
      is_transfer: false,
      fee: 0,
      is_added: false,
      is_removed: false,
    };
  }

  return formattedTransaction;
}

export async function tokensTransfers(
  data: Transaction,
  address: string
): Promise<WalletExplorerTransaction[]> {
  // Calculate transaction cost
  const tx_cost = (Number(data.gasPrice) * data.gasAmount) / 10 ** 18;

  // Check if the wallet is sender
  const isOut = data.inputs?.some((input) => input.address === address);

  // Initialize an array to store formatted transactions
  const transactions: WalletExplorerTransaction[] = [];

  // Check if both inputs and outputs exist
  if (data.inputs && data.outputs) {
    // Set to store unique contract IDs
    const contractIds = new Set<string>();
    // Collect unique contract IDs from input tokens
    for (const input of data.inputs) {
      const inputContractIds = input.tokens?.map((token) => token.id);
      if (inputContractIds) {
        inputContractIds.forEach((id) => contractIds.add(id as string)); // Add each contract id to the Set
      }
    }

    // Iterate over unique contract IDs to generate transactions
    for (const contractId of contractIds) {
      // Find the input and output related to the current contract ID
      const input = data.inputs.find((input) =>
        input.tokens?.some((token) => token.id === contractId)
      );
      const output = data.outputs.find(
        (output) =>
          output.hint !== input?.outputRef?.hint &&
          output.tokens?.some((token) => token.id === contractId)
      );

      if (input && output) {
        // Get the amount received from the output
        const amountReceived =
          output.tokens?.find((token) => token.id === contractId)?.amount ||
          output.attoAlphAmount ||
          "0";

        // Get contract address from contract ID
        let contractsAddress: string | undefined;
        if (contractId) {
          const contracts = addressFromContractId(contractId); // Pass the string as an argument
          contractsAddress = contracts.toString(); // Remove the argument from the toString method call
        }
        // Create formatted transaction object
        const formattedTransaction: WalletExplorerTransaction = {
          hash: data.hash,
          block_number: await getBlockNumber(data.blockHash), // Populate as needed
          wallet: address, // Populate as needed
          contract: contractsAddress || "",
          timestamp: data.timestamp,
          from: input.address || "",
          to: output.address || "",
          tx_cost: tx_cost.toString(),
          amount: String(amountReceived),
          value_usd: 0,
          method_id: "",
          is_out: isOut || false,
          is_transfer: false,
          fee: 0,
          is_added: false,
          is_removed: false,
        };

        transactions.push(formattedTransaction);
      }
    }
  }

  return transactions;
}

export async function dappTransactionsFormat(
  data: Transaction,
  address: string
): Promise<WalletExplorerTransaction[]> {
  const tx_cost = (Number(data.gasPrice) * data.gasAmount) / 10 ** 18;
  const isOut = data.inputs?.some((input) => input.address === address);
  const transactions: WalletExplorerTransaction[] = [];
  const inputHint = data.inputs?.[0]?.outputRef?.hint;
  const blockNumber = await getBlockNumber(data.blockHash);

  // Set to store unique token IDs
  const tokenIds = new Set<string>();

  // Process inputs to collect unique token IDs
  data.inputs?.forEach((input) => {
    if (input.unlockScript && input.tokens) {
      input.tokens.forEach((token) => {
        tokenIds.add(token.id ?? "");
      });
    }
  });

  // Determine the recipient address
  let to: string = "";
  for (const input of data.inputs || []) {
    if (input?.outputRef?.hint !== inputHint && input.address !== address) {
      to = input?.address || "";
      break; // Break loop once recipient address is found
    }
  }

  // Iterate over unique token IDs to generate transactions
  for (const tokenId of tokenIds) {
    let finalAmount = 0; // Reset finalAmount for each token ID

    // Find total output amount for this token ID
    for (const output of data.outputs || []) {
      if (output.hint === inputHint && output.tokens) {
        const matchingOutputTokens = output.tokens.find(
          (token) => token.id === tokenId
        );
        if (matchingOutputTokens) {
          finalAmount = parseInt(matchingOutputTokens.amount);
        }
      }
    }

    // Process each input for the same token ID
    for (const input of data.inputs || []) {
      if (input?.unlockScript && input.tokens) {
        const matchingToken = input.tokens.find(
          (token) => token.id === tokenId
        );

        let contractsAddress: string | undefined;
        if (tokenId) {
          const contracts = addressFromContractId(tokenId); // Pass the string as an argument
          contractsAddress = contracts.toString(); // Remove the argument from the toString method call
        }
        if (matchingToken) {
          const amount = (Number(matchingToken.amount) || 0) - finalAmount;
          const transaction: WalletExplorerTransaction = {
            hash: data.hash,
            block_number: blockNumber,
            wallet: address,
            contract: contractsAddress || "",
            timestamp: data.timestamp,
            from: address,
            to: to,
            tx_cost: tx_cost.toString(),
            amount: String(amount),
            value_usd: 0,
            method_id: "",
            is_out: isOut || false,
            is_transfer: false,
            fee: 0,
            is_added: false,
            is_removed: false,
          };
          transactions.push(transaction);
        }
      }
    }
  }

  // Calculate total native amount on the Input array
  let totalNativeAmount = 0;
  for (const input of data.inputs || []) {
    if (!input.tokens) {
      totalNativeAmount += Number(input.attoAlphAmount || "0");
    }
  }

  // const totalNativeAmount = totalNativeAmountOnOutput(data, inputHint? inputHint : 0);

  const filteredInputs = data.inputs?.filter(
    (input) => input.address === address
  );
  const totalAlphAmount = filteredInputs?.reduce((total, input) => {
    return total + parseInt(input.attoAlphAmount ?? "0");
  }, 0);
  const outputamount = data.outputs?.[0].tokens
    ? data.outputs?.[0].tokens.map((amount) => amount.amount)
    : data.outputs?.[0].attoAlphAmount;

  // Create a single transaction for the total native amount if it's not zero
  if (totalNativeAmount !== 0) {
    const amount = Math.abs(Number(totalAlphAmount) - Number(outputamount));
    const transactionWithoutTokens: WalletExplorerTransaction = {
      hash: data.hash,
      block_number: blockNumber,
      wallet: address,
      contract: "",
      timestamp: data.timestamp,
      from: address,
      to: to,
      tx_cost: tx_cost.toString(),
      amount: String(amount),
      value_usd: 0,
      method_id: "",
      is_out: isOut || false,
      is_transfer: false,
      fee: 0,
      is_added: false,
      is_removed: false,
    };
    transactions.push(transactionWithoutTokens);
  }

  // Receivring side

  const receiverContractIds = new Set<string>();

  for (const output of data.outputs || []) {
    if (output.hint == inputHint) {
      if (output.tokens) {
        output.tokens.forEach((token) => {
          receiverContractIds.add(token.id ?? "");
        });
      }
    }
  }

  let contractAddress: string[] = [];

  if (data.outputs) {
    contractAddress = data.outputs
      .filter((output) => output.type === "ContractOutput") // Filter outputs with type "ContractOutput"
      .map((output) => output.address); // Map the addresses of filtered outputs
  }

  for (const tokenId of receiverContractIds) {
    for (const output of data.outputs || []) {
      if (output.hint === inputHint && output.tokens) {
        const matchingToken = output.tokens.find(
          (token) => token.id === tokenId
        );

        let contractsAddress: string | undefined;
        if (tokenId) {
          const contracts = addressFromContractId(tokenId); // Pass the string as an argument
          contractsAddress = contracts.toString(); // Remove the argument from the toString method call
        }
        if (matchingToken) {
          const formattedTransaction: WalletExplorerTransaction = {
            hash: data.hash,
            block_number: blockNumber || 0, // Populate with appropriate value
            wallet: address || "", // Populate with appropriate value
            contract: contractsAddress || "",
            timestamp: data.timestamp,
            from: contractAddress[contractAddress.length - 1] || "", // Populate with appropriate value
            to: address || "", // Populate with appropriate value
            tx_cost: tx_cost.toString(),
            amount: String(matchingToken.amount || 0), // Extract amount from matchingToken
            value_usd: 0,
            method_id: "",
            is_out: false,
            is_transfer: false,
            fee: 0,
            is_added: false,
            is_removed: false,
          };
          transactions.push(formattedTransaction);
        }
      }
    }
  }

  //   // Calculate total native amount on the Output array
  let nativeTokenOnOutput = 0;

  const firstContractIndex = findContractOutputIndex(data.outputs || []);

  const outputLength = data?.outputs?.length || 0;

  if (firstContractIndex !== -1 && firstContractIndex < outputLength) {
    for (let i = firstContractIndex; i < outputLength; i++) {
      const output = data?.outputs?.[i];
      if (
        output?.hint == inputHint &&
        output?.type !== "ContractOutput" &&
        !output?.tokens
      ) {
        nativeTokenOnOutput += Number(output?.attoAlphAmount);
      }
    }
  }

  const finalamount = Math.abs(Number(nativeTokenOnOutput));

  // Native Transfer on output array
  if (finalamount > 0) {
    for (const output of data.outputs || []) {
      if (output.hint != inputHint) {
        const from = output.address || "";

        const transaction: WalletExplorerTransaction = {
          hash: data.hash,
          block_number: blockNumber,
          wallet: address,
          contract: "",
          timestamp: data.timestamp,
          from: contractAddress[contractAddress.length - 1],
          to: address,
          tx_cost: tx_cost.toString(),
          amount: String(finalamount),
          value_usd: 0,
          method_id: "",
          is_out: false,
          is_transfer: false,
          fee: 0,
          is_added: false,
          is_removed: false,
        };
        transactions.push(transaction);
        break;
      }
    }
  }

  return transactions;
}

export async function formatTransaction(
  data: Transaction,
  address: string
): Promise<WalletExplorerTransaction[]> {
  // Check if the transaction has contract outputs
  if (data.outputs) {
    const hasContractOutput = data.outputs.some(
      (output) => output.type === "ContractOutput"
    );
    // If contract outputs are found, format the transaction as a DApp transaction
    if (hasContractOutput) {
      return await dappTransactionsFormat(data, address);
    }
  }
  // Check if the transaction involves token transfers
  if (data.inputs) {
    const hasTokenTransfer = data.inputs.some(
      (input) => input.tokens && input.tokens.length > 0
    );
    // If token transfers are found, format the transaction accordingly
    if (hasTokenTransfer) {
      return await tokensTransfers(data, address);
    }
  }

  // If no special cases are detected, format the transaction as a native transfer
  return [await nativeTransfers(data, address)];
}

function findContractOutputIndex(outputs: any[]): number {
  for (let i = 0; i < outputs.length; i++) {
    if (outputs[i].type === "ContractOutput") {
      return i;
    }
  }
  return -1; // If no "ContractOutput" is found
}

module.exports = {
  getTransactionsForAddress,
};
