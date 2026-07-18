const express = require('express');
const { createOrder } = require('./paypal');

const router = express.Router();

// Voice-agent tool definition and handler. The handler is also exported so it
// can be registered directly by an agent runtime without making an HTTP call.
const tool = {
  name: 'pay_vendor',
  description: 'Creates a PayPal Sandbox order for a vendor payment and returns an order ID and approval link.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['amount', 'currency', 'description'],
    properties: {
      amount: { type: 'number', exclusiveMinimum: 0, description: 'Payment amount.' },
      currency: { type: 'string', pattern: '^[A-Za-z]{3}$', description: 'Three-letter currency code.' },
      description: { type: 'string', minLength: 1, description: 'Reason for the vendor payment.' },
    },
  },
};

async function payVendor({ amount, currency, description } = {}) {
  try {
    const order = await createOrder(amount, currency, description);
    return { success: true, ...order };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

router.post('/pay-vendor', express.json(), async (req, res) => {
  const result = await payVendor(req.body);
  res.status(result.success ? 201 : 502).json(result);
});

module.exports = { router, tool, payVendor };
