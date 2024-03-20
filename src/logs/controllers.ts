import { Request,Response } from "express";
import { logResult } from "../Interface";
import { Pool } from "pg";
const pool:Pool = require("../database");
const queries = require("../queries");




const getLogs = (req: Request, res: Response): void => {
    try {
        pool.query<logResult>(queries.queryLogs, (error: Error, results: {rows: logResult[]}) => {
            if (error) {
                console.error('Error executing query:', error);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

            res.status(200).json(results.rows);
        });
    } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


const getLogsByAddress = (req: Request<{ address: string }>, res: Response): void => {
    const { address } = req.params;

    try {
        pool.query<logResult>(queries.queryLogsByAddress, [address], (error: Error, results: {rows:logResult[]}) => {
            if (error) {
                console.error('Error executing query:', error);
                res.status(500).json({ error: 'Internal server error on getLogsByAddress' });
                return;
            }
            res.status(200).json(results.rows);
        });
    } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).json({ error: 'Internal server error on getLogsByAddress' });
    }
};

const getLogsByRange = (req: Request, res: Response): void => {
    const { address, fromBlock, toBlock } = req.params;

    // Parse fromBlock and toBlock as integers
    const parsedFromBlock: number = parseInt(fromBlock);
    const parsedToBlock: number = parseInt(toBlock);

    // Check if the parsed values are valid integers
    if (isNaN(parsedFromBlock) || isNaN(parsedToBlock)) {
        res.status(400).json({ error: 'Invalid block numbers' });
        return;
    }

    try {
        pool.query<logResult>(queries.queryLogsByRange, [address, parsedFromBlock, parsedToBlock], (error: Error, results: {rows:logResult[]}) => {
            if (error) {
                console.error('Error executing query:', error);
                res.status(500).json({ error: 'Internal server error on getLogsByRange' });
                return;
            }
            res.status(200).json(results.rows);
        });
    } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).json({ error: 'Internal server error on getLogsByRange' });
    }
};



module.exports ={
 getLogs,
 getLogsByAddress,
 getLogsByRange
}