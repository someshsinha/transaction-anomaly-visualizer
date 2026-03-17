const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); // You'll need to npm install uuid

const stream = fs.createWriteStream('sample.csv');
stream.write('id,timestamp,amount,merchant,category,account_from,account_to\n');

console.log('Generating 10,000 transactions...');

for (let i = 0; i < 10000; i++) {
  const id = uuidv4();
  const ts = new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString();
  const amount = (Math.random() * 5000).toFixed(2);
  const merchants = ['Amazon', 'Steam', 'Uber', 'Walmart', 'Netflix'];
  const categories = ['Entertainment', 'Transport', 'Shopping', 'Food'];
  
  const acc_from = `ACC${Math.floor(Math.random() * 1000)}`;
  const acc_to = `ACC${Math.floor(Math.random() * 1000)}`;

  stream.write(`${id},${ts},${amount},${merchants[i%5]},${categories[i%4]},${acc_from},${acc_to}\n`);
}

stream.end(() => console.log('✅ sample.csv created with 10,000 rows!'));