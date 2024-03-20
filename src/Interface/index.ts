"use strict"

//Export Types
export interface Block {
    block_hash: string;
    block_number: number;
    difficulty: string;
    extra_data: string;
    gas_limit: string;
    gas_used: string;
    miner: string;
    nonce: string;
    timestamp: string;
    parent_hash: string;
    base_fee_per_gas: string;
    transaction_hashes: string[];
}

export interface logResult {
    tx_hash: string;
    transaction_index: number;
    block_number: number;
    block_hash: string;
    address: string;
    topics: string[];
    data: string;
    log_index: number;
}

export interface TransactionResponse {
    tx_hash: string;
    block_number: number;
    block_hash: string;
    from_address: string;
    to_address: string;
    contract_address: string | null;
    confirmations: number;
    cummulativegasused: string;
    effectivegasprice: string;
    status: number;
    type: number;
    byzantium: boolean;
    gasused: number;
    transaction_index: number;
    address: string;
    topics: string[];
    data: string;
    log_index: number;
}