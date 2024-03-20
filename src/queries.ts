//BLOCK QUERIES


const queryBlock = "SELECT * FROM blocks ORDER BY block_number DESC LIMIT 25"; //LIMIT THE SIZE TO 50 BLOCKS DATA

const queryBlockById = "SELECT * FROM blocks WHERE block_number = $1";

const insertBlock = "INSERT INTO blocks (block_hash , parent_hash,block_number,timestamp,nonce,difficulty,gas_limit,gas_used,miner,extra_data,base_fee_per_gas,transaction_hashes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)";
const insertTransaction ="INSERT INTO transactions ( tx_hash,block_number,block_hash,from_address,to_address,contract_address,confirmations,cummulativegasused , effectivegasprice , status , type,byzantium, gasused) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)";

const queryBlockFromRange = "SELECT * FROM blocks WHERE block_number BETWEEN $1 AND $2";


const queryTransaction = "SELECT * FROM transactions ORDER BY block_number DESC LIMIT 25";
const queryTransactionsByHash = "SELECT * FROM transactions WHERE tx_hash =$1";
const queryTransactionsByHashandLogs = "SELECT t.*, l.* FROM transactions t LEFT JOIN logs l ON t.tx_hash = l.tx_hash WHERE t.tx_hash = $1";

const queryLogs = "SELECT * FROM logs ORDER BY block_number DESC LIMIT 25";
const queryLogsByAddress = "SELECT * FROM logs WHERE address = $1";
const queryLogsByRange = `SELECT * FROM logs WHERE address = $1 AND block_number  BETWEEN $2 AND $3 ORDER BY block_number ASC`;

module.exports={
    insertBlock, 
    queryBlock, 
    queryBlockFromRange , 
    queryBlockById, 
    insertTransaction, 
    queryTransaction, 
    queryTransactionsByHash,
    queryTransactionsByHashandLogs,
    queryLogs,
    queryLogsByAddress,
    queryLogsByRange,
};
