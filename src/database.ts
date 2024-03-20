import { Pool } from 'pg';

const poolConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'shiva',
    password: 'test1234',
    port: 5432, // Change port if necessary
};

const pool: Pool = new Pool(poolConfig);

export = pool;

