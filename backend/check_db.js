const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query('SELECT snag_id, reported_by, snag_code FROM snags LIMIT 10;');
    console.log('Total snags found:', res.rows.length);
    console.log(res.rows);
    
    const users = await pool.query('SELECT user_id, name, role FROM users LIMIT 10;');
    console.log('Users:', users.rows);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
