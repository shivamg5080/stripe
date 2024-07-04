const stripe = Stripe('pk_test_51PY3b92MJOa6Z4YFfuJgRFEXsj9Z4F0pg7goZOGWFp6mMesfLralNouHogPl6Vo3omimclg8DRIC81gfWd7kiO8p00jq1l2i73');
const elements = stripe.elements();
const cardElement = elements.create('card');
cardElement.mount('#card-element');

let token = '';

document.getElementById('register-button').addEventListener('click', async () => {
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  const response = await fetch('/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  console.log(data.message);
});

document.getElementById('login-button').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const response = await fetch('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  token = data.token;
  console.log('Logged in:', token);
});

document.getElementById('checkout-button').addEventListener('click', async () => {
  try {
    const response = await fetch('/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const { clientSecret } = await response.json();

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: 'Customer Name'
        }
      },
      setup_future_usage: 'off_session'
    });

    if (error) {
      console.error(error.message);
    } else if (paymentIntent.status === 'succeeded') {
      console.log('Payment succeeded!');
    }
  } catch (error) {
    console.error(error);
  }
});

document.getElementById('subscribe-button').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const planId = document.getElementById('plan').value;

  const { setupIntent, error: setupError } = await stripe.confirmCardSetup(
    'seti_1IaQxh2eZvKYlo2C3fLgLNQU', {
      payment_method: {
        card: cardElement,
        billing_details: {
          email: email,
        },
      }
    }
  );

  if (setupError) {
    console.error(setupError);
  } else {
    try {
      const response = await fetch('/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentMethodId: setupIntent.payment_method,
          planId: planId
        })
      });
      const subscription = await response.json();
      console.log('Subscription succeeded:', subscription);
    } catch (error) {
      console.error(error);
    }
  }
});
