import { ethers } from 'ethers';
import { Request, Response } from 'express';

const express = require("express");
const pool = require("./database");
const queries = require("./queries");


const blockRoutes = require("./blocks/route");
const transactionRoutes = require("./transactions/route");
const logsRoutes = require("./logs/route");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/api/v1/blocks', blockRoutes);
app.use('/api/v1/txn', transactionRoutes);
app.use('/api/v1/logs', logsRoutes);

// Root route
app.get('/', (req: Request, res: Response) => {
  res.send('Hello sacha! sup!');
});


// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


function initializeProvider(): ethers.providers.Provider {
    const apikey = "Yn0SxinPuP7HJoNuprd6sq1hOJ_7BvZ8"; // Alchemy API KEY
    const alchemyProvider = new ethers.providers.AlchemyProvider("mainnet", apikey);
    const ankrRpcProvider = new ethers.providers.JsonRpcProvider("https://rpc.ankr.com/eth");
    
    // Create FallbackProviderConfig for each backend provider
    const alchemyConfig = {
        provider: alchemyProvider,
        priority: 1, // Example priority
        weight: 1, // Example weight
        stallTimeout: 5000 // Example stall timeout in milliseconds
    };

    const ankrRpcConfig = {
        provider: ankrRpcProvider,
        priority: 2,        
        weight: 1,
        stallTimeout: 3000
    };
    
    // Add more FallbackProviderConfig objects for additional backend providers if needed
    
    // Create FallbackProvider with the configured backend providers
    const fallbackProvider = new ethers.providers.FallbackProvider([alchemyConfig , ankrRpcConfig]); // Add more configs if needed
    
    // Log provider initialization
    console.log('Ethers.js FallbackProvider initialized');
    
    // Return the initialized FallbackProvider
    return fallbackProvider;
}





async function listenForBlocks(provider: ethers.providers.Provider) {

    //Event listener for new blocks
    provider.on("block", async (blockNumber:number) => {
        try {
            // Fetch block details
            const block = await provider.getBlock(blockNumber);
            console.log(`New block: ${block}`);
            // Extract block details
            const hash = block.hash;
            const parentHash = block.parentHash;
            const number = block.number;
            const timestamp = new Date(block.timestamp * 1000); // Convert Unix timestamp to JavaScript Date object
            const nonce = block.nonce;
            const difficulty = block.difficulty;
            // const gasLimit = ethers.BigNumber.from(block.gasLimit._hex);
            // const gasUsed = ethers.BigNumber.from(block.gasUsed._hex);
            const gasLimit = block.gasLimit._hex.toString();
            const gasUsed = block.gasUsed?._hex.toString();
            const miner = block.miner;
            const extraData = block.extraData;
            const baseFeePerGasDecimal = ethers.BigNumber.from(block.baseFeePerGas?._hex);
            const baseFeePerGasGwei = ethers.utils.formatUnits(baseFeePerGasDecimal, "gwei");
            const transactionHashes = block.transactions.map(tx => tx);

            // Insert block details into the database
            pool.query(queries.insertBlock, [hash, parentHash, number, timestamp, nonce, difficulty, gasLimit, gasUsed, miner, extraData, baseFeePerGasGwei,transactionHashes], async (error: Error, results: any) => {
                if (error) {
                    console.error('Error inserting block into the database:', error);
                    // Handle the error appropriately (e.g., log, send notification, etc.)
                    return
                } 
                console.log(`Block ${number} inserted successfully into the database.`);
                for (const txHash of block.transactions) {
                    try {
                        const tx = await provider.getTransactionReceipt(txHash);
                        const gasUsed = tx.gasUsed._hex.toString();
                        const cumulativeGasUsed = tx.cumulativeGasUsed._hex.toString();
                        const effectiveGasPrice = tx.effectiveGasPrice._hex.toString();
                        const {
                              to,
                              from,
                              contractAddress,
                              blockHash,
                              transactionHash,
                              blockNumber,
                              confirmations,
                              status,
                              type,
                              byzantium,
                        } = tx;
            
                          // Insert transaction details into the database
                        pool.query(queries.insertTransaction, [transactionHash, blockNumber, blockHash, from, to, contractAddress, confirmations,cumulativeGasUsed,effectiveGasPrice,status,type,byzantium,gasUsed], (error: Error, results: any) => {
                            if (error) {
                                console.error('Error inserting transaction into the database:', error);
                                // Handle the error appropriately
                            } 
                            console.log(`Transaction ${transactionHash} inserted successfully into the transaction Table in the  database.`);

                            // Iterate through transaction logs
                            for (const log of tx.logs) {
                                const { transactionHash, transactionIndex, blockNumber, blockHash, address, topics, data, logIndex } = log;
                                 const topicsString = `{${topics.map(topic => `"${topic}"`).join(',')}}`;
                                // Insert log details into the database
                                const insertLog = "INSERT INTO logs (tx_hash,transaction_index,block_number,block_hash,address,topics,data,log_index) VALUES($1,$2,$3,$4,$5,$6,$7,$8)"
                                pool.query(insertLog, [transactionHash, transactionIndex, blockNumber, blockHash, address, topicsString, data, logIndex], (error: Error, results: any) => {
                                    if (error) {
                                        console.error('Error inserting log into the database:', error);
                                        return;
                                    } 
                                    console.log(`Log inserted successfully into the database.`);
                                });
                            }
                              
                              
                        });
                    } catch (error) {
                        console.error('Error inserting transaction into the database:', error);
                    }
                }
            });
        } catch (error) {
            console.error('Error in listenForBlocks:', error);
            // You might want to handle the error here, e.g., retrying, logging, etc.
        }
    });
}


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


// Main function to initialize provider and start listening for blocks
async function main() {
    try {

       const provider = initializeProvider(); // Initialize Ethereum provider
       await listenForBlocks(provider); // Listen for new blocks
    
    } catch (error) {
      console.error('Error starting server:', error);
      process.exit(1);
    }
}

// Execute main function
main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
