# Balena Pricing/Savings Calculators

This library provides a set of functions that can be used to calculate credit purchase costs
and savings when compared to dynamic billing. Credit pricing definitions can be passed in during
instantiation, useful for testing and experimentation, but pricing definitions used in production
are also defined within this package.

## Usage

```typescript
import { CreditPricing } from '@balena/balena-pricing';

// Format output to dollar currency.
const dollar = Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
});
function toDollar(pennies: number): string {
	return dollar.format(pennies / 100);
}

// Set dynamic base price.
const dynamicPrice = 150;

// Use production credit pricing definitions.
let pricing = new CreditPricing();

// Use production credit pricing definitions.
// Explicitly target current versions (default).
let pricing = new CreditPricing({
	target: 'current',
});

// Use production credit pricing definitions.
// Target most recent versions, even those slated for future use.
pricing = new CreditPricing({
	target: 'latest',
});

// Use production credit pricing parameters.
// Target version 2, will return undefined for features without a version 2.
let pricing = new CreditPricing({
	target: 2,
});

// Use production credit pricing parameters.
// Target most recent versions valid up to a given date.
let pricing = new CreditPricing({
	target: new Date('2023-03-01T00:00:00Z'),
});

// Use custom credit pricing parameters.
// Mostly useful for testing parameters against the curve,
// should not normally be used in production.
pricing = CreditPricing({
	credits: {
		'foo:bar': [
			{
				version: 1,
				validFrom: new Date('2023-02-01T00:00:00Z'),
				basePriceCents: 150,
				firstDiscountPriceCents: 149,
				discountRate: 0.33,
				discountThreshold: 12000,
				discountThresholdPriceCents: 125,
			},
		],
	},
});

// Get individual credit price
const creditPrice = pricing.getCreditPrice('foo:bar', 0, 1000);
console.log('Credit unit price:', toDollar(creditPrice));

// Get total price for credit purchase
const totalPrice = pricing.getCreditTotalPrice('foo:bar', 0, 1000);
console.log('Credit total price:', toDollar(totalPrice));

// Get discount percentage compared to dynamic
const discount = pricing.getDiscountOverDynamic('foo:bar', 0, 1000, dynamicPrice);
console.log('Discount over dynamic:', `${discount}%`);

// Get total savings for credit purchase compared to dynamic
const totalSavings = pricing.getTotalSavings('foo:bar', 0, 1000, dynamicPrice);
console.log('Total savings:', toDollar(totalSavings));
```
