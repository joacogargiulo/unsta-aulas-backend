// db.ts
import { Pool } from 'pg';
import type { QueryResult, QueryResultRow } from 'pg'; 
import 'dotenv/config'; 

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false 
  },
  // AÑADIR ESTA LÍNEA para limitar el pool de Node.js a 2 conexiones
  max: 2 
});

export const db = {
  query: <T extends QueryResultRow>(text: string, params?: any[]): Promise<QueryResult<T>> => {
    return pool.query(text, params);
  },
};

console.log('PostgreSQL Pool inicializado...');

export default pool;