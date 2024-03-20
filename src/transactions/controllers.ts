import { Request,Response } from "express";
import { TransactionResponse } from "../Interface";
import { Pool } from 'pg';

const queries = require("../queries");
const pool: Pool = require("../database");

const getTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
        pool.query<TransactionResponse>(queries.queryTransaction, (error: Error, results: {rows:TransactionResponse[]}) => {
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


const getTransactionsByHashandLogs = async (req: Request, res: Response): Promise<void> => {
    const transaction_hash: string = req.params.txn;

    if (transaction_hash.length !== 66) {
        res.status(400).json({ error: "Invalid Txn Hash" });
        return
    }

    try {
        pool.query<TransactionResponse>(queries.queryTransactionsByHashandLogs, [transaction_hash], (err: Error, results: {rows: TransactionResponse[]}) => {
            if (err) {
                console.error('Error executing query:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (results.rows.length === 0) {
                return res.status(404).json({ error: 'Transaction not found or Invalid Transaction' });
            }

            const transactionData: TransactionResponse = results.rows[0];
            res.status(200).json(transactionData);
        });
    } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports ={
    getTransactions,
    getTransactionsByHashandLogs
}