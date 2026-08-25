const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_Sz1MWTkia6gZ@ep-long-silence-al4ypdz9-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require' });
client.connect()
  .then(() => client.query('SELECT attachments FROM questions ORDER BY "createdAt" DESC LIMIT 5'))
  .then(res => { console.log(JSON.stringify(res.rows, null, 2)); client.end(); })
  .catch(console.error);
