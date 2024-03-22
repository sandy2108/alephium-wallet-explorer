import { ethers, providers } from 'ethers';
import { Request, Response } from 'express';
import { insertBlockDetails } from './blockProcessor';

const express = require("express");



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
    // const apikey = "Yn0SxinPuP7HJoNuprd6sq1hOJ_7BvZ8"; // Alchemy API KEY
    const apikey = "McqRqcKVY-8JkRwFPxpw0gkcly_d862w";
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
    const fallbackProvider = new ethers.providers.FallbackProvider([alchemyConfig, ankrRpcConfig]); // Add more configs if needed

    // Log provider initialization
    console.log('Ethers.js FallbackProvider initialized');

    // Return the initialized FallbackProvider
    return fallbackProvider;
}





async function listenForBlocks(provider: ethers.providers.Provider) {

    //Event listener for new blocks
    provider.on("block", async (blockNumber: number) => {
        try {
            // Insert block details into the database
            await insertBlockDetails(provider, blockNumber);
            
        } catch (error) {
            console.error("Error handling block event:", error);
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
