const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')('sk_test_51PY3b92MJOa6Z4YFOvDnQugLl5QEHOkzQDwceeyKu5wplHdIQczJnO8AqavfhbMbEzqjJIxnljoy3umTvckxEDlH00PsMN95uq');
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

const users = []; // Replace with a proper database

const JWT_SECRET = 'YOUR_JWT_SECRET_KEY';

// Registration endpoint
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = { email, password: hashedPassword };
  users.push(user);

  res.status(201).send({ message: 'User registered successfully' });
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(user => user.email === email);
  if (!user) {
    return res.status(400).send({ message: 'Invalid email or password' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).send({ message: 'Invalid email or password' });
  }

  const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '1h' });

  res.send({ token });
});

// Middleware to authenticate and authorize requests
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }

    req.user = user;
    next();
  });
};

// Payment intent endpoint
app.post('/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 2000, // amount in cents, e.g. $20.00
      currency: 'usd',
      setup_future_usage: 'off_session'
    });
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Subscription endpoint
app.post('/create-subscription', authenticateToken, async (req, res) => {
  try {
    const { paymentMethodId, planId } = req.body;

    // Create customer
    const customer = await stripe.customers.create({
      email: req.user.email,
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ plan: planId }],
      expand: ['latest_invoice.payment_intent'],
    });

    res.send(subscription);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
