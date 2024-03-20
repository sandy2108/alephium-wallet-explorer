import { Request, Response } from 'express';
import { Block } from '../Interface';
import { Pool } from 'pg';

const queries = require("../queries");
const pool: Pool = require("../database");


const getBlock = async (req: Request, res: Response): Promise<void> => {
    try {
        pool.query<Block>(queries.queryBlock, (error: Error, results: {rows:Block[]}) => {
            if (error) {
                console.error('Error executing query:', error);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

            if (!results || !results.rows || results.rows.length === 0) {
                res.status(404).json({ error: 'No blocks found' });
                return;
            }

            res.status(200).json(results.rows);
        });
    } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


const getBlockById = async (req: Request, res: Response): Promise<void> => {
    const blockId: number = parseInt(req.params.block);
    if (isNaN(blockId)) {
        res.status(400).json({ error: 'Invalid block ID' });
        return;
    }

    try {
        const block = await pool.query<Block>(queries.queryBlockById, [blockId]);
        if (block.rows.length === 0) {
            res.status(404).json({ error: 'Block not found' });
            return;
        }
        res.status(200).json(block.rows[0]);
    } catch (error) {
        console.error('Error fetching block by ID:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const getBlockFromRange = async (req: Request, res: Response): Promise<void> => {
    const fromBlock: number = parseInt(req.params.from);
    const toBlock: number = parseInt(req.params.to);

    if (isNaN(fromBlock) || isNaN(toBlock) || fromBlock > toBlock) {
        res.status(400).json({ error: 'Invalid block range on getblockFromRange' });
        return;
    }

    try {
        const results: {rows: Block[]} = await pool.query<Block>(queries.queryBlockFromRange, [fromBlock, toBlock]);

        if (!results || !results.rows || results.rows.length === 0) {
            res.status(404).json({ error: 'No blocks found in the specified range' });
            return;
        }

        res.status(200).json(results.rows);
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Internal server error on getblockFromRange' });
    }
}


module.exports = {
    getBlock,
    getBlockById,
    getBlockFromRange
}
