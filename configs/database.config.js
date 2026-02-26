import { Pool } from "pg"

export const pool = new Pool({
    user: 'oxygen',
    host: 'localhost',
    database: 'oxygen',
    password: 'oxygen',
    port: 5432
})

pool.on('connect', async(con) => {
    console.log("Database connected");
})

try{
    await pool.query("SELECT NOW()");
}
catch(err){
    console.log(err);
}

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1); // Common pattern to restart the app on critical DB errors
});