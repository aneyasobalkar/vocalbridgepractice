require('dotenv').config();
const { payVendor } = require('../server/payVendor');

async function main() {
  const amount = process.argv[2] || '1.00';
  const currency = process.argv[3] || 'USD';
  const description = process.argv.slice(4).join(' ') || 'PayPal Sandbox vendor payment test';

  console.log(`Creating sandbox order for ${amount} ${currency}...`);
  const result = await payVendor({ amount, currency, description });
  console.log(JSON.stringify(result, null, 2));

  if (!result.success) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`PayPal test failed: ${error.message}`);
  process.exitCode = 1;
});
