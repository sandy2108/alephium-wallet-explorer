type Transaction = {
    hash: string;
    blockHash: string;
    block_number: number;
    timestamp: number;
    inputs?: {
        outputRef?: {
            hint?: number,
            key?: string,
        },
        unlockScript?: string,
        txHashRef?: string,
        address?: string,
        attoAlphAmount?: string,
        tokens: {
            id?: string,
            amount?: string,
        }[],
    }[];
    outputs?: {
        type: string;
        hint: number;
        key: string;
        attoAlphAmount: string;
        address: string;
        tokens:{
            id:string;
            amount:string;
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
}

type BlockHash = {
    hash: string,
    timestamp: number,
    chainFrom: number,
    chainTo: number,
    height: number,
    txNumber: number,
    mainChain: true,
    hashRate: string,
}


async function getBlockNumber(blockHash:string) {
    try {
        const blockEndpoint = `https://backend.mainnet.alephium.org/blocks/${blockHash}`;
        const response = await fetch(blockEndpoint);
        if (!response.ok) {
            throw new Error(`Failed to fetch block number for block hash ${blockHash}`);
        }
        const data = await response.json();
        return data.height;
    } catch (error) {
        console.error(`Error fetching block number for block hash ${blockHash}:`, error);
        throw error;
    }
}

async function getTransactionsForAddress(address: string, page: number, limit: number): Promise<WalletExplorerTransaction[]> {
    try {
        const walletTxnPoint: string = `https://backend.mainnet.alephium.org/addresses/${address}/transactions?page=${page}&limit=${limit}`;
        const response = await fetch(walletTxnPoint);
        if (!response.ok) {
            if (response.status === 400) {
                throw new Error('Bad request: Something bad in the request');
            } else if (response.status === 401) {
                throw new Error('Unauthorized');
            } else if (response.status === 404) {
                throw new Error('Not found');
            } else {
                throw new Error('Failed to fetch transactions');
            }
        }
        const data: Transaction[] = await response.json();
        const formatTxnPromises = data.map((txn: Transaction) => formatTransaction(txn, address));
        const formatTxn = await Promise.all(formatTxnPromises);
        return formatTxn.flat();
    } catch (error) {
        console.error("Error on Fetching Wallet Transactions:", error);
        throw error;
    }
}


async function nativeTransfers(data: Transaction, address: string): Promise<WalletExplorerTransaction> {
   const tx_cost = (Number(data.gasPrice) * data.gasAmount) / (10 ** 18);
   const isOut = data.inputs?.some(input => input.address === address);
   const contract = data.inputs?.flatMap(input => input.tokens?.map(token => token.id)).filter(Boolean).join(', ') || "";

   const from = Array.isArray(data.inputs) 
   ? [...new Set(data.inputs.map(input => input.address))].join(', ') 
   : '';
 
   const inputHint = data.inputs?.[0]?.outputRef?.hint;
   const receiver = data.outputs?.find(output => output.hint !== inputHint);
   const to = receiver?.address || '';
    let amountReceived;
    if(receiver?.tokens) {
      const amount = receiver.tokens.find(token => token.id === data.inputs?.[0]?.tokens?.[0]?.id);
      amountReceived = amount?.amount || 0;   
    }else{
        amountReceived = receiver?.attoAlphAmount || 0;
    }
    
    const formattedTransaction: WalletExplorerTransaction = {
      hash: data.hash,
      block_number: await getBlockNumber(data.blockHash), // Populate as needed
      wallet: address, // Populate as needed
      contract: contract,
      timestamp: data.timestamp,
      from: from,
      to: to,
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

   return formattedTransaction;
}


async function formatTransaction(data: Transaction, address: string): Promise<WalletExplorerTransaction[]> {

    if (data.outputs?.some(output => output.type === "ContractOutput")) {
        return await dappTransactionsFormat(data, address);
    }

    if (data.inputs?.some(input => !input.tokens)) {
        // Call nativeTransfers function and return its result
        return [await nativeTransfers(data, address)];
    }


    const tx_cost = (Number(data.gasPrice) * data.gasAmount) / (10 ** 18);
    const isOut = data.inputs?.some(input => input.address === address);

    const transactions: WalletExplorerTransaction[] = [];

    if (data.inputs && data.outputs) {
        const contractIds = new Set<string>();
        for (const input of data.inputs) {
            const inputContractIds = input.tokens?.map(token => token.id);
            if (inputContractIds) {
                inputContractIds.forEach(id => contractIds.add(id as string)); // Add each contract id to the Set
            }
        }

        for (const contractId of contractIds) {
            const input = data.inputs.find(input => input.tokens?.some(token => token.id === contractId));
            const output = data.outputs.find(output => output.hint !== input?.outputRef?.hint && output.tokens?.some(token => token.id === contractId));

            if (input && output) {
                const amountReceived = output.tokens?.find(token => token.id === contractId)?.amount || output.attoAlphAmount || '0';

                const formattedTransaction: WalletExplorerTransaction = {
                    hash: data.hash,
                    block_number: await getBlockNumber(data.blockHash), // Populate as needed
                    wallet: address, // Populate as needed
                    contract: contractId,
                    timestamp: data.timestamp,
                    from: input.address || '',
                    to: output.address || '',
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


async function dappTransactionsFormat(data: Transaction, address: string): Promise<WalletExplorerTransaction[]> {

    let isTokens: boolean = false;

    const tx_cost = (Number(data.gasPrice) * data.gasAmount) / (10 ** 18);
    const isOut = data.inputs?.some(input => input.address === address);
    const transactions: WalletExplorerTransaction[] = [];
    const inputHint = data.inputs?.[0]?.outputRef?.hint;
    const outputamount = data.outputs?.[0].tokens ? data.outputs?.[0].tokens.map(amount=>amount.amount) :data.outputs?.[0].attoAlphAmount;
    const filteredInputs = data.inputs?.filter(input => input.address === address);
    const totalAlphAmount = filteredInputs?.reduce((total, input) => {
        return total + parseInt(input.attoAlphAmount ?? '0');
    }, 0);

    
    const blockNumber = await getBlockNumber(data.blockHash);

    let senderTokens = 0;
    let senderContract = "";

    data.inputs?.forEach(input => {
        if (input.unlockScript) {
            if(input.tokens){
                isTokens = true;
                senderContract = input.tokens ? input.tokens.map(token => token.id).join(", ") : "";
                senderTokens += input.tokens ? input.tokens.map(token => parseInt(token.amount ?? "0")).reduce((acc, val) => acc + val, 0) : 0;
            }
        }
    });

    const amount = isTokens ? senderTokens :  (Number(totalAlphAmount) || 0) - (Number(outputamount) || 0);

    for (const input of data.inputs || []) {
        if (input?.outputRef?.hint !== inputHint && input.address !== address) {
            
            const to = input?.address || '';

            const formattedTransaction: WalletExplorerTransaction = {
                hash: data.hash,
                block_number: blockNumber, // Populate as needed
                wallet: address, // Populate as needed
                contract: senderContract,
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

            transactions.push(formattedTransaction);
        }
    }


    let receiverAmounts:number = 0; // Initialize the amount variable outside the forEach loop
    let receiverContract:string = "";
    let receiverTokens:number = 0;
    let receiverNativeTokens:number = 0;

    let token:boolean = false;

    data.outputs?.forEach(output => {
        if (output.hint === inputHint) {
            
            if(output.tokens){
                token = true;
                receiverContract = output.tokens ? output.tokens.map(token => token.id).join() : "";
                receiverTokens += output.tokens.map(token => parseInt(token.amount)).reduce((acc, val) => acc + val, 0);
            }
            
        
            receiverAmounts += parseInt(output.attoAlphAmount); // Increment the amount by the value of output.attoAlphAmount
            receiverNativeTokens = Math.abs((Number(receiverAmounts) - Number(totalAlphAmount)));
            
        }
    });

    let receiverTokensAmount = token? receiverTokens : receiverNativeTokens ;

    for (const output of data.outputs || []) {
        const from = output.type === "ContractOutput" ? output.address : "";
        if (output.hint !== inputHint) {
            
            const formattedTransaction: WalletExplorerTransaction = {
                hash: data.hash,
                block_number: blockNumber, // Populate as needed
                wallet: address, // Populate as needed
                contract: receiverContract,
                timestamp: data.timestamp,
                from: from,
                to: address,
                tx_cost: tx_cost.toString(),
                amount: String(receiverTokensAmount),
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
    return transactions;
}


async function main() {
    try {
        const result = await getTransactionsForAddress("1Hd3g9D9uJ2EbQYXDG6igZz1ZsfBnxCgVz6JZKbiBXsWF", 1, 9);
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});


