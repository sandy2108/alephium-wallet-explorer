import { ethers, providers } from 'ethers';
const pool = require("./database");
const queries = require("./queries");

export async function insertBlockDetails(provider: ethers.providers.Provider, blockNumber:number): Promise<void> {
    try {
        const block = await provider.getBlock(blockNumber)
        const { hash, parentHash, number, nonce, difficulty, miner, extraData } = block;


        const timestamp = new Date(block.timestamp * 1000); // Convert Unix timestamp to JavaScript Date object

        const gasLimit = block.gasLimit._hex.toString();
        const gasUsed = block.gasUsed?._hex.toString();
        const baseFeePerGasDecimal = ethers.BigNumber.from(block.baseFeePerGas?._hex);
        const baseFeePerGasGwei = ethers.utils.formatUnits(baseFeePerGasDecimal, "gwei");
        const transactionHashes = block.transactions.map(tx => tx);
        // Insert block details into the database (simplified for brevity)
        console.log(`Inserting block ${block.number}`);
        const result = await pool.query(queries.insertBlock, [hash, parentHash, number, timestamp, nonce, difficulty, gasLimit, gasUsed, miner, extraData, baseFeePerGasGwei, transactionHashes]);
     
        console.log(`Block ${number} inserted successfully into the database.`);
        
        for(const txhash of transactionHashes){
            insertTransactionDetails(txhash,provider);
        }

    } catch (error) {
        console.error('Error inserting block into the database:', error);
    }
}

export async function insertTransactionDetails(txHash: string, provider:ethers.providers.Provider): Promise<void> {
    try {
        const tx = await provider.getTransactionReceipt(txHash);
        const gasUsed = tx.gasUsed.toHexString();
        const cumulativeGasUsed = tx.cumulativeGasUsed.toHexString();
        const effectiveGasPrice = tx.effectiveGasPrice?.toHexString() ?? '0x'; // Check for nullish value
        const { to, from, contractAddress, blockHash, transactionHash, blockNumber, confirmations, status, type, byzantium } = tx;

        // Here's how to properly use async/await with pool.query
        const result = await pool.query(queries.insertTransaction, [
            transactionHash,
            blockNumber,
            blockHash,
            from,
            to,
            contractAddress,
            confirmations,
            cumulativeGasUsed,
            effectiveGasPrice,
            status,
            type,
            byzantium,
            gasUsed
        ]);
        console.log(`Transaction ${transactionHash} inserted successfully into the transaction Table in the database.`);

        for (const logs of tx.logs ){
            await insertLogs(logs)
        }
    } catch (error) {
        console.error('Error inserting transaction:', error);
    }
}

type logs = {
    address: string,
    blockHash: string,
    blockNumber: number,
    data:string,
    logIndex:number,
    topics:Array<string>,
    transactionHash: string,
    transactionIndex:number,
}

// Insert log details into the database
export async function insertLogs(log: logs): Promise<void> {
    try {
        const insertLogQuery = `
            INSERT INTO logs (tx_hash, transaction_index, block_number, block_hash, address, topics, data, log_index) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        const { transactionHash, transactionIndex, blockNumber, blockHash, address, topics, data, logIndex } = log;
        const topicsString = `{${topics.join(',')}}`; // Assuming topics is already an array of strings

        // Use async/await with pool.query directly
        await pool.query(insertLogQuery, [
            transactionHash, transactionIndex, blockNumber, blockHash, address, topicsString, data, logIndex
        ]);

        console.log(`Log inserted successfully into the database.`);
    } catch (error) {
        console.error('Error inserting log into the database:', error);
    }
}

