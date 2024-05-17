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

async function getBlockNumber(blockHash: string) {
  let attempts = 0;
  const maxRetries = 5;
  const initialDelay = 100; // 100ms initial delay
  const maxDelay = 20000; // 10s maximum delay

  while (attempts < maxRetries) {
    try {
      // Fetch the block number from the block hash
      const blockEndpoint = `https://backend.mainnet.alephium.org/blocks/${blockHash}`;
      const response = await fetch(blockEndpoint);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch block number for block hash ${blockHash}`
        );
      }
      const data = await response.json();
      return data.height;
    } catch (error) {
      // Increment the attempts counter
      attempts += 1;
      console.error(
        `Error fetching block number for block hash ${blockHash}:`,
        error
      );

      // Calculate the delay using exponential backoff
      const delay = Math.min(initialDelay * 2 ** attempts, maxDelay);
      console.log(`Retrying in ${delay}ms...`);

      // Wait for the calculated delay before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // If we've reached the max retries, throw the error
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
  let receiver =
    data.outputs?.find((output) => output.hint !== inputHint) ||
    data.outputs?.find((output) => output.hint === inputHint);

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
      amount: String(BigInt(amounts)) || "0",
      value_usd: 0,
      method_id: "",
      is_out: false,
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
      amount: String(BigInt(amountReceived)),
      value_usd: 0,
      method_id: "",
      is_out: true,
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
  const blockNumber = await getBlockNumber(data.blockHash);
  const inputHint = data.inputs?.[0]?.outputRef?.hint;
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

      let output;
      output = data.outputs.find(
        (output) =>
          output.hint !== input?.outputRef?.hint &&
          output.tokens?.some((token) => token.id === contractId)
      );

      if (!output) {
        output = data.outputs.find((output) =>
          output.tokens?.some((token) => token.id === contractId)
        );
      }

      if (input && output) {
        // Get the amount received from the output
        const amountReceived =
          output.tokens?.find((token) => token.id === contractId)?.amount ||
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
          block_number: blockNumber, // Populate as needed
          wallet: address, // Populate as needed
          contract: contractsAddress || "",
          timestamp: data.timestamp,
          from: input.address || "",
          to: output.address || "",
          tx_cost: tx_cost.toString(),
          amount: String(BigInt(amountReceived)),
          value_usd: 0,
          method_id: "",
          is_out: input.address === address ? true : false,
          is_transfer: false,
          fee: 0,
          is_added: false,
          is_removed: false,
        };

        transactions.push(formattedTransaction);
      }
    }
  }

  //ALPH NATIVE TRANSFER
  let inputAmount = 0;
  let outputAmount = 0;

  let to: string = "";
  for (const input of data.inputs || []) {
    if (input?.outputRef?.hint !== inputHint && input.address !== address) {
      to = input?.address || "";
      break; // Break loop once recipient address is found
    }
  }
  // If recipient address is not found in inputs, search in outputs
  if (to === "") {
    for (const output of data.outputs || []) {
      if (output.hint !== inputHint && output.address !== address) {
        to = output.address;
        break; // Break loop once recipient address is found
      }
    }
  }

  let conditionalHint: number | undefined = undefined;

  for (const input of data.inputs || []) {
    if (input.address === address && input.outputRef?.hint) {
      conditionalHint = input.outputRef.hint;
      break;
    }
  }

  if (!inputHint && data.inputs && data.inputs.length > 0) {
    conditionalHint = 0;
  }

  for (const input of data.inputs || []) {
    if (input.unlockScript && input.address == address) {
      inputAmount += Number(input.attoAlphAmount);
    }
  }

  for (const output of data.outputs || []) {
    if (
      (output?.hint == conditionalHint || output.address == address) &&
      output?.type !== "ContractOutput"
    ) {
      outputAmount += Number(output.attoAlphAmount);
    }
  }
  if (inputAmount > outputAmount) {
    const transaction: WalletExplorerTransaction = {
      hash: data.hash,
      block_number: blockNumber,
      wallet: address,
      contract: "",
      timestamp: data.timestamp,
      from: address,
      to: to,
      tx_cost: tx_cost.toString(),
      amount: String(BigInt(inputAmount - outputAmount)),
      value_usd: 0,
      method_id: "",
      is_out: true,
      is_transfer: false,
      fee: 0,
      is_added: false,
      is_removed: false,
    };
    transactions.push(transaction);
  } else if (inputAmount < outputAmount) {
    const transaction: WalletExplorerTransaction = {
      hash: data.hash,
      block_number: blockNumber,
      wallet: address,
      contract: "",
      timestamp: data.timestamp,
      from: to,
      to: address,
      tx_cost: tx_cost.toString(),
      amount: String(BigInt(outputAmount - inputAmount)),
      value_usd: 0,
      method_id: "",
      is_out: false,
      is_transfer: false,
      fee: 0,
      is_added: false,
      is_removed: false,
    };
    transactions.push(transaction);
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
  const totalTokenIds = new Set<string>();

  // Process inputs to collect unique token IDs and store it in the Set
  data.inputs?.forEach((input) => {
    if (input.unlockScript && input.tokens) {
      input.tokens.forEach((token) => {
        totalTokenIds.add(token.id ?? "");
      });
    }
  });

  // Process outputs to collect unique token IDs and store it in the Set
  data.outputs?.forEach((output) => {
    if (
      output.tokens &&
      output?.hint == inputHint &&
      output.type !== "ContractOutput"
    ) {
      output.tokens.forEach((token) => {
        totalTokenIds.add(token.id);
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
  // If recipient address is not found in inputs, search in outputs
  if (to === "") {
    for (const output of data.outputs || []) {
      if (output.hint !== inputHint && output.address !== address) {
        to = output.address;
        break; // Break loop once recipient address is found
      }
    }
  }

  // Iterate over unique token IDs to generate transactions
  for (const tokenId of totalTokenIds) {
    let tokenOutputAmount: bigint = BigInt(0);
    let tokenInputAmount: bigint = BigInt(0);

    //Filtering the TokenId Amount from the output Array
    const matchingOutputTokens =
      data.outputs?.filter(
        (output) =>
          output.tokens?.some((token) => token.id === tokenId) &&
          output.hint === inputHint &&
          output.address === address &&
          output.type !== "ContractOutput"
      ) || [];
    //Calculate the total amount of tokens in Output Array
    if (matchingOutputTokens.length > 0) {
      for (const output of matchingOutputTokens) {
        if (output.tokens) {
          for (const token of output.tokens) {
            const tokenAmount = BigInt(token.amount || 0);
            tokenOutputAmount += tokenAmount;
          }
        }
      }
    } else {
      tokenOutputAmount = BigInt(0); // If no matching output tokens are found, set the amount to 0
    }

    // Filtering the TokenId Amount from the Input Array
    const matchingInputTokens =
      data.inputs?.filter(
        (input) =>
          input.address === address &&
          input.unlockScript &&
          input.tokens &&
          input.tokens.some((token) => token.id === tokenId)
      ) || [];
    //Calculate the total amount of tokens in Output Array
    if (matchingInputTokens.length > 0) {
      for (const input of matchingInputTokens) {
        // Ensure input.tokens is defined before using it
        if (input.tokens) {
          for (const token of input.tokens) {
            // Ensure token.amount is defined before adding it to tokenInputAmounts
            const tokenAmount = BigInt(token.amount || 0);
            tokenInputAmount += tokenAmount;
          }
        }
      }
    } else {
      tokenInputAmount = BigInt(0); // If no matching output tokens are found, set the amount to 0
    }

    // Initialize an array to store contract addresses
    // because the contract should return the amount to user so the contract address is the sender
    let contractAddress: string[] = [];

    if (data.outputs) {
      contractAddress = data.outputs
        .filter((output) => output.type === "ContractOutput") // Filter outputs with type "ContractOutput"
        .map((output) => output.address); // Map the addresses of filtered outputs
    }

    // If the input amount is greater than the output amount,
    // then it should return back the remaining amount.
    // so we subtract the input amount from the output amount and return it in amount field

    if (tokenInputAmount > tokenOutputAmount) {
      let contractsAddress;
      if (tokenId) {
        const contracts = addressFromContractId(tokenId);
        contractsAddress = contracts.toString();
      }
      const transaction = {
        hash: data.hash,
        block_number: blockNumber,
        wallet: address,
        contract: contractsAddress || "",
        timestamp: data.timestamp,
        from: address,
        to: to,
        tx_cost: tx_cost.toString(),
        amount: String(BigInt(tokenInputAmount) - BigInt(tokenOutputAmount)),
        value_usd: 0,
        method_id: "",
        is_out: true,
        is_transfer: false,
        fee: 0,
        is_added: false,
        is_removed: false,
      };
      transactions.push(transaction);
    } else if (tokenInputAmount < tokenOutputAmount) {
      // If the output amount is greater than the input amount,
      // so we subtract the output amount from the input amount and return it in amount field
      // Sender is the contract address in this case because we interact with contract
      let contractsAddress;
      if (tokenId) {
        const contracts = addressFromContractId(tokenId);
        contractsAddress = contracts.toString();
      }
      const transaction = {
        hash: data.hash,
        block_number: blockNumber,
        wallet: address,
        contract: contractsAddress || "",
        timestamp: data.timestamp,
        from: contractAddress[contractAddress.length - 1] || "",
        to: address,
        tx_cost: tx_cost.toString(),
        amount: String(BigInt(tokenOutputAmount) - BigInt(tokenInputAmount)),
        value_usd: 0,
        method_id: "",
        is_out: false,
        is_transfer: false,
        fee: 0,
        is_added: false,
        is_removed: false,
      };
      transactions.push(transaction);
    }
  }

  //ALPH NATIVE TRANSFER
  let inputAmount = 0;
  let outputAmount = 0;

  let conditionalHint: number | undefined = undefined;

  for (const input of data.inputs || []) {
    if (input.address === address && input.outputRef?.hint) {
      conditionalHint = input.outputRef.hint;
      break;
    }
  }

  if (!inputHint && data.inputs && data.inputs.length > 0) {
    conditionalHint = 0;
  }

  for (const input of data.inputs || []) {
    if (input.unlockScript && input.address == address) {
      inputAmount += Number(input.attoAlphAmount);
    }
  }

  for (const output of data.outputs || []) {
    if (
      (output?.hint == conditionalHint || output.address == address) &&
      output?.type !== "ContractOutput"
    ) {
      outputAmount += Number(output.attoAlphAmount);
    }
  }
  if (inputAmount > outputAmount) {
    const transaction: WalletExplorerTransaction = {
      hash: data.hash,
      block_number: blockNumber,
      wallet: address,
      contract: "",
      timestamp: data.timestamp,
      from: address,
      to: to,
      tx_cost: tx_cost.toString(),
      amount: String(BigInt(inputAmount - outputAmount)),
      value_usd: 0,
      method_id: "",
      is_out: true,
      is_transfer: false,
      fee: 0,
      is_added: false,
      is_removed: false,
    };
    transactions.push(transaction);
  } else if (inputAmount < outputAmount) {
    const transaction: WalletExplorerTransaction = {
      hash: data.hash,
      block_number: blockNumber,
      wallet: address,
      contract: "",
      timestamp: data.timestamp,
      from: to,
      to: address,
      tx_cost: tx_cost.toString(),
      amount: String(BigInt(outputAmount - inputAmount)),
      value_usd: 0,
      method_id: "",
      is_out: false,
      is_transfer: false,
      fee: 0,
      is_added: false,
      is_removed: false,
    };
    transactions.push(transaction);
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

module.exports = {
  getTransactionsForAddress,
};
