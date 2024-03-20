"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var ethers_1 = require("ethers");
var express = require("express");
var pool = require("./database");
var queries = require("./queries");
var blockRoutes = require("./blocks/route");
var transactionRoutes = require("./transactions/route");
var app = express();
var PORT = 3000;
function initializeProvider() {
    // Replace the URL with the Ethereum node URL you want to connect to
    // const apikey = "Yn0SxinPuP7HJoNuprd6sq1hOJ_7BvZ8"; //Alchemmy API KEY 
    var provider = new ethers_1.ethers.providers.JsonRpcProvider("https://rpc.ankr.com/eth");
    // Log provider initialization
    console.log('Ethers.js provider initialized');
    return provider;
}
app.get('/', function (req, res) {
    res.send('Hello World!');
});
app.use("/api/v1/blocks", blockRoutes);
app.use("/api/v1/txn", transactionRoutes);
function listenForBlocks(provider) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            //Event listener for new blocks
            provider.on("block", function (blockNumber) { return __awaiter(_this, void 0, void 0, function () {
                var block_1, hash, parentHash, number_1, timestamp, nonce, difficulty, gasLimit, gasUsed, miner, extraData, baseFeePerGasDecimal, baseFeePerGasGwei, error_1;
                var _this = this;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, provider.getBlock(blockNumber)];
                        case 1:
                            block_1 = _b.sent();
                            console.log("New block: ".concat(block_1));
                            hash = block_1.hash;
                            parentHash = block_1.parentHash;
                            number_1 = block_1.number;
                            timestamp = new Date(block_1.timestamp * 1000);
                            nonce = block_1.nonce;
                            difficulty = block_1.difficulty;
                            gasLimit = block_1.gasLimit._hex.toString();
                            gasUsed = block_1.gasUsed._hex.toString();
                            miner = block_1.miner;
                            extraData = block_1.extraData;
                            baseFeePerGasDecimal = ethers_1.ethers.BigNumber.from((_a = block_1.baseFeePerGas) === null || _a === void 0 ? void 0 : _a._hex);
                            baseFeePerGasGwei = ethers_1.ethers.utils.formatUnits(baseFeePerGasDecimal, "gwei");
                            // Insert block details into the database
                            pool.query(queries.insertBlock, [hash, parentHash, number_1, timestamp, nonce, difficulty, gasLimit, gasUsed, miner, extraData, baseFeePerGasGwei], function (error, results) { return __awaiter(_this, void 0, void 0, function () {
                                var _loop_1, _i, _a, txHash;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            if (error) {
                                                console.error('Error inserting block into the database:', error);
                                                // Handle the error appropriately (e.g., log, send notification, etc.)
                                                return [2 /*return*/];
                                            }
                                            console.log("Block ".concat(number_1, " inserted successfully into the database."));
                                            _loop_1 = function (txHash) {
                                                var tx, gasUsed_1, cumulativeGasUsed, effectiveGasPrice, to, from, contractAddress, blockHash, transactionHash_1, blockNumber_1, confirmations, status_1, type, byzantium, error_2;
                                                return __generator(this, function (_c) {
                                                    switch (_c.label) {
                                                        case 0:
                                                            _c.trys.push([0, 2, , 3]);
                                                            return [4 /*yield*/, provider.getTransactionReceipt(txHash)];
                                                        case 1:
                                                            tx = _c.sent();
                                                            gasUsed_1 = tx.gasUsed._hex.toString();
                                                            cumulativeGasUsed = tx.cumulativeGasUsed._hex.toString();
                                                            effectiveGasPrice = tx.effectiveGasPrice._hex.toString();
                                                            to = tx.to, from = tx.from, contractAddress = tx.contractAddress, blockHash = tx.blockHash, transactionHash_1 = tx.transactionHash, blockNumber_1 = tx.blockNumber, confirmations = tx.confirmations, status_1 = tx.status, type = tx.type, byzantium = tx.byzantium;
                                                            // Insert transaction details into the database
                                                            pool.query(queries.insertTransaction, [transactionHash_1, blockNumber_1, blockHash, from, to, contractAddress, confirmations, cumulativeGasUsed, effectiveGasPrice, status_1, type, byzantium, gasUsed_1], function (error, results) {
                                                                if (error) {
                                                                    console.error('Error inserting transaction into the database:', error);
                                                                    // Handle the error appropriately
                                                                }
                                                                else {
                                                                    console.log("Transaction ".concat(transactionHash_1, " inserted successfully into the transaction Table in the  database."));
                                                                }
                                                            });
                                                            return [3 /*break*/, 3];
                                                        case 2:
                                                            error_2 = _c.sent();
                                                            console.error('Error inserting transaction into the database:', error_2);
                                                            return [3 /*break*/, 3];
                                                        case 3: return [2 /*return*/];
                                                    }
                                                });
                                            };
                                            _i = 0, _a = block_1.transactions;
                                            _b.label = 1;
                                        case 1:
                                            if (!(_i < _a.length)) return [3 /*break*/, 4];
                                            txHash = _a[_i];
                                            return [5 /*yield**/, _loop_1(txHash)];
                                        case 2:
                                            _b.sent();
                                            _b.label = 3;
                                        case 3:
                                            _i++;
                                            return [3 /*break*/, 1];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _b.sent();
                            console.error('Error in listenForBlocks:', error_1);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
app.listen(PORT, function () {
    console.log("Server is running on http://localhost:".concat(PORT));
});
// Main function to initialize provider and start listening for blocks
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var provider;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    provider = initializeProvider();
                    return [4 /*yield*/, listenForBlocks(provider)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Execute main function
main().catch(function (error) {
    console.error('Error:', error);
    process.exit(1);
});
