let request = require('request')
request = request.defaults({
  jar: true
})
let cheerio = require('cheerio')
let chalk = require('chalk')
let config = require('./config.json')

function makePayment (authToken, paymentGateway, checkout_total_price, trackedStartCheckout, verifiedId, cookieJar) {
  let option = {
    method: 'POST',
    url: `https://checkout.shopify.com/2147974/checkouts/${trackedStartCheckout}`,
    followAllRedirects: true,
    headers: {
      'Origin': 'https://checkout.shopify.com',
      'Host': 'checkout.shopify.com',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      'Referer': `https://checkout.shopify.com/2147974/checkouts/${trackedStartCheckout}?previous_step=shipping_method&step=payment_method`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36'
    },
    jar: cookieJar,
    formData: {
      '_method': 'patch',
      'authenticity_token': authToken,
      'checkout[buyer_accepts_marketing]': '1',
      'checkout[client_details][browser_height]': '979',
      'checkout[client_details][browser_width]': '631',
      'checkout[client_details][javascript_enabled]': '1',
      'checkout[credit_card][vault]': 'false',
      'checkout[different_billing_address]': 'false',
      'checkout[payment_gateway]': paymentGateway,
      'checkout[total_price]': checkout_total_price,
      'complete': '1',
      'previous_step': 'payment_method',
      's': verifiedId,
      'step': '',
      'utf8': '✓'
    }
  }
  request(option, (err, res, body) => {
    if (err || body === undefined) {
      console.log('Error with payment')
    } else {
      console.log(chalk.cyan.bold('Payment successful! :) Check your email for a confirmation'))
    }
  })
}

const sendCCInfo = (authToken, paymentGateway, checkout_total_price, trackedStartCheckout, cookieJar) => {
  console.log(`Total will be ${checkout_total_price} Sending CC info for verification.`)
  let option = {
    method: 'POST',
    url: 'https://elb.deposit.shopifycs.com/sessions',
    followAllRedirects: true,
    headers: {
      'Accept': 'application/json',
      'Origin': 'https://checkout.shopifycs.com',
      'Accept-Language': 'en-US,en;q=0.8',
      'Host': 'elb.deposit.shopifycs.com',
      'content-type': 'application/json',
      'Referer': `https://checkout.shopifycs.com/number?identifier=${trackedStartCheckout}&location=https%3A%2F%2Fcheckout.shopify.com%2F2147974%2Fcheckouts%2F${trackedStartCheckout}%3Fprevious_step%3Dshipping_method%26step%3Dpayment_method`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36'
    },
    form: {
      'credit_card': {
        'month': config.cc.month,
        'name': config.cc.name,
        'number': config.cc.number,
        'verification_value': config.cc.verification_value,
        'year': config.cc.year
      }
    }
  }
  request(option, (err, res, body) => {
    if (err || body === undefined) {
      console.log(chalk.red.bold('Shopify could not verify your credit card.'))
      return sendCCInfo(authToken, paymentGateway, checkout_total_price, trackedStartCheckout, cookieJar)
    } else {
      console.log(chalk.white.bold('Card Verified!'))
      var verifiedId = JSON.parse(body).id
      return makePayment(authToken, paymentGateway, checkout_total_price, trackedStartCheckout, verifiedId, cookieJar)
    }
  })
}

const goToPaymentPage = (trackedStartCheckout, cookieJar) => {
  let option = {
    method: 'GET',
    url: `https://checkout.shopify.com/2147974/checkouts/${trackedStartCheckout}?previous_step=shipping_method&step=payment_method`,
    jar: cookieJar,
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    }
  }
  request(option, (err, res, body) => {
    if (err) {
      console.log('error @ going to payment page')
      return goToPaymentPage(trackedStartCheckout, cookieJar)
    } else {
      console.log('On payment page..')
      let $ = cheerio.load(body)
      let authToken = null
      let allInputTags = $('input')
      for (var i = 0; i < allInputTags.length; i++) {
        if (allInputTags[i].attribs.name === 'authenticity_token') {
          authToken = allInputTags[i].attribs.value
        }
      }
      if (authToken !== null) {
        let paymentGateway = $('input[name="checkout[payment_gateway]"]').eq(0).attr('value')
        let checkout_total_price = $('input[name="checkout[total_price]"]').attr('value')
        return sendCCInfo(authToken, paymentGateway, checkout_total_price, trackedStartCheckout, cookieJar)
      } else {
        return goToPaymentPage(trackedStartCheckout, cookieJar)
      }
    }
  })
}

const submitShippingOption = (trackedStartCheckout, cookieJar, authToken, shipping) => {
  let option = {
    url: `https://checkout.shopify.com/2147974/checkouts/${trackedStartCheckout}`,
    followAllRedirects: true,
    method: 'POST',
    jar: cookieJar,
    headers: {
      'Origin': 'https://checkout.shopify.com',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      'Referer': `https://checkout.shopify.com/2147974/checkouts/${trackedStartCheckout}`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36'
    },
    formData: {
      'utf8': '✓',
      '_method': 'patch',
      'authenticity_token': authToken,
      'button': '',
      'previous_step': 'shipping_method',
      'step': 'payment_method',
      'checkout[shipping_rate][id]': shipping,
      'checkout[client_details][javascript_enabled]': '1'
    }
  }

  request(option, function (err, response, body) {
    if (err) {
      console.log('Error @ SubmitShippingOption')
      return submitShippingOption(trackedStartCheckout, cookieJar, authToken, shipping)
    } else {
      console.log('Picked shipping option..')
      return goToPaymentPage(trackedStartCheckout, cookieJar)
    }
  })
}

const pickShippingMethod = (trackedStartCheckout, cookieJar) => {
  var option = {
    method: 'GET',
    url: `https://checkout.shopify.com/2147974/checkouts/${trackedStartCheckout}?previous_step=contact_information&step=shipping_method`,
    jar: cookieJar,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36',
      'content-type': 'application/x-www-form-urlencoded'
    }
  }
  console.log('Picking shipping method..')
  request(option, function (err, res, body) {
    if (err) {
      console.log('Error @ PickShippingMethod')
      return pickShippingMethod(trackedStartCheckout, cookieJar)
    }
    let $ = cheerio.load(body)
    let shipping = $('.input-radio').attr('value')
    let allInputTags = $('input')
    let authToken = null
    for (var i = 0; i < allInputTags.length; i++) {
      if (allInputTags[i].attribs.name === 'authenticity_token') {
        authToken = allInputTags[i].attribs.value
      }
    }
    if (authToken !== null) {
      return submitShippingOption(trackedStartCheckout, cookieJar, authToken, shipping)
    } else {
      return pickShippingMethod(trackedStartCheckout, cookieJar)
    }
  })
}

const fillInUserInfo = (authToken, cookieJar, trackedStartCheckout) => {
  console.log('Filling in user information..')
  var option = {
    method: 'POST',
    url: `https://checkout.shopify.com/2147974/checkouts/${trackedStartCheckout}`,
    jar: cookieJar,
    formData: {
      'utf8': '✓',
      '_method': 'patch',
      'authenticity_token': authToken,
      'previous_step': 'contact_information',
      'step': 'shipping_method',
      'button': '',
      'checkout[email]': config.checkout.email,
      'checkout[shipping_address][first_name]': config.checkout.first_name,
      'checkout[shipping_address][last_name]': config.checkout.last_name,
      'checkout[shipping_address][company]': '',
      'checkout[shipping_address][address1]': config.checkout.address,
      'checkout[shipping_address][address2]': '',
      'checkout[shipping_address][city]': config.checkout.city,
      'checkout[shipping_address][country]': config.checkout.country,
      'checkout[shipping_address][province]': config.checkout.province,
      'checkout[shipping_address][zip]': config.checkout.zip,
      'checkout[shipping_address][phone]': config.checkout.phone,
      'checkout[remember_me]': '0',
      'checkout[client_details][browser_height]': '979',
      'checkout[client_details][browser_width]': '631',
      'checkout[client_details][javascript_enabled]': '1'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36',
      'content-type': 'application/x-www-form-urlencoded'
    }
  }
  request(option, (err, res, body) => {
    if (err || res == null) {
      console.log('Err @ filling in user info')
      return fillInUserInfo(authToken, cookieJar, trackedStartCheckout)
    } else {
      // get auth token from ship method page
      return pickShippingMethod(trackedStartCheckout, cookieJar)
    }
  })
}

const liveChecker = () => {
  let cookieJar = request.jar()
  let option = {
    url: 'http://sneakerpolitics.com/cart/29296631440:1',
    // url: 'http://sneakerpolitics.com/cart/17425356037:1',
    header: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.95 Safari/537.36'
    },
    jar: cookieJar
  }

  request(option, (err, res, body) => {
    if (err || res == null) {
      console.log('Error @ Live Checker, re-running..')
      setTimeout(() => {
        liveChecker()
      }, 1000)
    }
    let $ = cheerio.load(body)
    let notLive = $('td').hasClass('product__status product__status--sold-out')
    // check to see if product is live
    if (notLive) {
      console.log('Not live yet, checking in 10 seconds..')
      setTimeout(() => {
        liveChecker()
      }, 10000)
    } else if (!notLive) {
      console.log('Carted..')
      let trackedStartCheckout = res.socket._httpMessage.path.split('/')[3] || null
      let authToken = $('input[name="authenticity_token"]').eq(0).attr('value') || null
      if (authToken === null) {
        console.log('no auth token..recarting')
        return liveChecker()
      } else if (authToken !== null && trackedStartCheckout !== null) {
        return fillInUserInfo(authToken, cookieJar, trackedStartCheckout)
      }
    }
  })
}

liveChecker()
