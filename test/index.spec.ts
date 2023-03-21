import { expect } from 'chai';
import { CreditPricing, InvalidParametersError } from '../src';

const dynamicPriceCents = 200;
const FEATURE_SLUG = 'foo:bar';
const now = Date.now();
const TEST_CREDITS = {
	'foo:bar': [
		{
			version: 1,
			validFrom: new Date(now - 60 * 60 * 2),
			firstDiscountPriceCents: 148,
			discountRate: 0.33,
			discountThreshold: 12000,
			discountThresholdPriceCents: 124,
		},
		{
			version: 2,
			validFrom: new Date(now - 60 * 60),
			firstDiscountPriceCents: 199,
			discountRate: 0.33,
			discountThreshold: 12000,
			discountThresholdPriceCents: 150,
		},
		{
			version: 3,
			validFrom: new Date(Date.now() + 60 * 60),
			firstDiscountPriceCents: 209,
			discountRate: 0.33,
			discountThreshold: 12000,
			discountThresholdPriceCents: 149,
		},
	],
	'buz:baz': [
		{
			version: 1,
			validFrom: new Date(now + 60 * 60),
			firstDiscountPriceCents: 189,
			discountRate: 0.33,
			discountThreshold: 12000,
			discountThresholdPriceCents: 149,
		},
	],
};

const pricing = new CreditPricing({
	credits: TEST_CREDITS,
	target: 'current',
});
const testCredit = TEST_CREDITS['foo:bar'][1];

const dollar = Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
});

/**
 * Convert pennies to dollar format
 * @param pennies - amount of pennies
 * @returns price in dollar format
 *
 * @example
 * const price = toDollar(149); // -> $1.49
 */
function toDollar(pennies: number): string {
	return dollar.format(pennies / 100);
}

describe('Instantiation', function () {
	let instance: CreditPricing | undefined;

	it('should use passed in credit pricing', function () {
		instance = new CreditPricing({
			credits: TEST_CREDITS,
		});
		expect(instance.credits).to.deep.equal(TEST_CREDITS);
	});

	it('should sort credit pricing definitions', function () {
		instance = new CreditPricing({
			credits: {
				'foo:bar': [
					{
						version: 2,
						validFrom: new Date(now),
						firstDiscountPriceCents: 1,
						discountRate: 0.1,
						discountThreshold: 1,
						discountThresholdPriceCents: 1,
					},
					{
						version: 3,
						validFrom: new Date(now + 60 * 60),
						firstDiscountPriceCents: 1,
						discountRate: 0.1,
						discountThreshold: 1,
						discountThresholdPriceCents: 1,
					},
					{
						version: 1,
						validFrom: new Date(now - 60 * 60),
						firstDiscountPriceCents: 1,
						discountRate: 0.1,
						discountThreshold: 1,
						discountThresholdPriceCents: 1,
					},
				],
			},
		});
		expect(instance.credits['foo:bar'][0].version).to.equal(3);
		expect(instance.credits['foo:bar'][1].version).to.equal(2);
		expect(instance.credits['foo:bar'][2].version).to.equal(1);
	});

	it('should use default credit pricing if instance not specified', function () {
		instance = new CreditPricing();
		expect(Object.keys(instance.credits)).to.include('device:microservices');
	});

	it('should throw on feature definitions with duplicate versions', function () {
		expect(() => {
			instance = new CreditPricing({
				credits: {
					'foo:bar': [
						{
							version: 1,
							validFrom: new Date(),
							firstDiscountPriceCents: 1,
							discountRate: 0.1,
							discountThreshold: 1,
							discountThresholdPriceCents: 1,
						},
						{
							version: 1,
							validFrom: new Date(now - 60 * 60),
							firstDiscountPriceCents: 1,
							discountRate: 0.1,
							discountThreshold: 1,
							discountThresholdPriceCents: 1,
						},
					],
				},
			});
		}).to.throw('Duplicate version 1 for feature foo:bar');
	});

	it('should throw on feature definitions with duplicate validFroms', function () {
		expect(() => {
			instance = new CreditPricing({
				credits: {
					'foo:bar': [
						{
							version: 1,
							validFrom: new Date(now),
							firstDiscountPriceCents: 1,
							discountRate: 0.1,
							discountThreshold: 1,
							discountThresholdPriceCents: 1,
						},
						{
							version: 2,
							validFrom: new Date(now),
							firstDiscountPriceCents: 1,
							discountRate: 0.1,
							discountThreshold: 1,
							discountThresholdPriceCents: 1,
						},
					],
				},
			});
		}).to.throw(
			`Duplicate validFrom ${new Date(now).toISOString()} for feature foo:bar`,
		);
	});
});

describe('getDefinition()', function () {
	let instance: CreditPricing | undefined;

	it('should return latest version when target option is "latest"', function () {
		instance = new CreditPricing({
			credits: TEST_CREDITS,
			target: 'latest',
		});
		expect(instance.getDefinition('foo:bar')).to.have.property('version', 3);
		expect(instance.getDefinition('buz:baz')).to.have.property('version', 1);
	});

	it('should return current version when no target option is "current"', function () {
		instance = new CreditPricing({
			credits: TEST_CREDITS,
			target: 'current',
		});
		expect(instance.getDefinition('foo:bar')).to.have.property('version', 2);
		expect(instance.getDefinition('buz:baz')).to.be.undefined;
	});

	it('should return current version when no target option is set', function () {
		instance = new CreditPricing({
			credits: TEST_CREDITS,
		});
		expect(instance.getDefinition('foo:bar')).to.have.property('version', 2);
		expect(instance.getDefinition('buz:baz')).to.be.undefined;
	});

	it('should return specific version when target option is a number', function () {
		instance = new CreditPricing({
			credits: TEST_CREDITS,
			target: 1,
		});
		expect(instance.getDefinition('foo:bar')).to.have.property('version', 1);
		expect(instance.getDefinition('buz:baz')).to.have.property('version', 1);

		instance = new CreditPricing({
			credits: TEST_CREDITS,
			target: 2,
		});
		expect(instance.getDefinition('foo:bar')).to.have.property('version', 2);
		expect(instance.getDefinition('buz:baz')).to.be.undefined;
	});

	it('should return version valid up to given date when target option is a date', function () {
		instance = new CreditPricing({
			credits: TEST_CREDITS,
			target: new Date(now),
		});
		expect(instance.getDefinition('foo:bar')).to.have.property('version', 2);
		expect(instance.getDefinition('buz:baz')).to.be.undefined;

		instance = new CreditPricing({
			credits: TEST_CREDITS,
			target: new Date(now + 60 * 60 * 24),
		});
		expect(instance.getDefinition('foo:bar')).to.have.property('version', 3);
		expect(instance.getDefinition('buz:baz')).to.have.property('version', 1);
	});

	it('should throw on undefined feature slug', function () {
		expect(() => {
			instance = new CreditPricing({
				credits: {
					'foo:bar': [
						{
							version: 1,
							validFrom: new Date(now),
							firstDiscountPriceCents: 1,
							discountRate: 0.1,
							discountThreshold: 1,
							discountThresholdPriceCents: 1,
						},
					],
				},
			});
			instance.getDefinition('buz:baz');
		}).to.throw('Feature buz:baz not supported for credits');
	});
});

describe('getCreditPrice()', function () {
	it('should throw on invalid feature slug', function () {
		expect(() => {
			pricing.getCreditPrice('buz-bar', 0, 1);
		}).to.throw('Feature buz-bar not supported for credits');
	});

	it('should throw on non-integer available credits', function () {
		expect(() => {
			pricing.getCreditPrice(FEATURE_SLUG, NaN, 0);
		}).to.throw('Available credits must be a whole number');
		expect(() => {
			pricing.getCreditPrice(FEATURE_SLUG, 10.5, 0);
		}).to.throw('Available credits must be a whole number');
	});

	it('should throw on negative available credits', function () {
		expect(() => {
			pricing.getCreditPrice(FEATURE_SLUG, -1, 0);
		}).to.throw('Available credits must be greater than or equal to 0');
	});

	it('should throw on non-integer available credits', function () {
		expect(() => {
			pricing.getCreditPrice(FEATURE_SLUG, 0, NaN);
		}).to.throw('Credit purchase amount must be a whole number');
		expect(() => {
			pricing.getCreditPrice(FEATURE_SLUG, 0, 10.5);
		}).to.throw('Credit purchase amount must be a whole number');
	});

	it('should throw on negative purchase amount', function () {
		expect(() => {
			pricing.getCreditPrice(FEATURE_SLUG, 0, -1);
		}).to.throw('Credit purchase amount must be greater than 0');
	});

	describe('should respect constructor target options', function () {
		it('should calculate using "current" version by default', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
			});

			// Should be using version 2 in this case.
			expect(toDollar(instance.getCreditPrice(FEATURE_SLUG, 0, 1))).to.equal(
				'$1.99',
			);
		});

		it('should calculate using "current" version by when target is "current"', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: 'current',
			});

			// Should be using version 2 in this case.
			expect(toDollar(instance.getCreditPrice(FEATURE_SLUG, 0, 1))).to.equal(
				'$1.99',
			);
		});

		it('should calculate using "latest" version by when target is "latest"', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: 'latest',
			});

			// Should be using version 3 in this case.
			expect(toDollar(instance.getCreditPrice(FEATURE_SLUG, 0, 1))).to.equal(
				'$2.09',
			);
		});

		it('should calculate using specified version by when target is a number', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: 1,
			});

			// Should be using version 1 in this case.
			expect(toDollar(instance.getCreditPrice(FEATURE_SLUG, 0, 1))).to.equal(
				'$1.48',
			);
		});

		it('should calculate using version valid up to given date by when target is a date', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: new Date(now - 60 * 60 * 2),
			});

			// Should be using version 1 in this case.
			expect(toDollar(instance.getCreditPrice(FEATURE_SLUG, 0, 1))).to.equal(
				'$1.48',
			);
		});
	});

	describe('when available credits are 0', function () {
		it('should throw when purchase amount is 0', function () {
			expect(() =>
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 0)),
			).to.throw('Credit purchase amount must be greater than 0');
		});

		it('should calculate price of a single credit', function () {
			expect(toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1))).to.equal(
				'$1.99',
			);
		});

		it('should calculate price of 1000 credits', function () {
			expect(toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1000))).to.equal(
				'$1.95',
			);
		});

		it('should calculate price of 1,000,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1000000)),
			).to.equal('$0.70');
		});

		it('should calculate price of 1,050,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1050000)),
			).to.equal('$0.69');
		});

		it('should calculate price of 1,160,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1160000)),
			).to.equal('$0.68');
		});

		it('should calculate price of 1,280,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1280000)),
			).to.equal('$0.67');
		});

		it('should calculate price of 1,420,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1420000)),
			).to.equal('$0.65');
		});

		it('should calculate price of 1,580,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1580000)),
			).to.equal('$0.64');
		});

		it('should calculate price of 1,760,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1760000)),
			).to.equal('$0.63');
		});

		it('should calculate price of 1,970,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1970000)),
			).to.equal('$0.62');
		});

		it('should calculate price of 2,200,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 2200000)),
			).to.equal('$0.61');
		});

		it('should calculate price of 2,470,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 2470000)),
			).to.equal('$0.59');
		});
	});

	describe('when available credits are at the aggressive discount threshold', function () {
		it('should throw when purchase amount is 0', function () {
			expect(() =>
				toDollar(
					pricing.getCreditPrice(FEATURE_SLUG, testCredit.discountThreshold, 0),
				),
			).to.throw('Credit purchase amount must be greater than 0');
		});

		it('should calculate price of a single credit', function () {
			expect(
				toDollar(
					pricing.getCreditPrice(FEATURE_SLUG, testCredit.discountThreshold, 1),
				),
			).to.equal('$1.50');
		});

		it('should calculate price of 1000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1000,
					),
				),
			).to.equal('$1.48');
		});

		it('should calculate price of 1,000,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1000000,
					),
				),
			).to.equal('$0.69');
		});

		it('should calculate price of 1,050,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1050000,
					),
				),
			).to.equal('$0.69');
		});

		it('should calculate price of 1,160,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1160000,
					),
				),
			).to.equal('$0.68');
		});

		it('should calculate price of 1,280,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1280000,
					),
				),
			).to.equal('$0.66');
		});

		it('should calculate price of 1,420,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1420000,
					),
				),
			).to.equal('$0.65');
		});

		it('should calculate price of 1,580,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1580000,
					),
				),
			).to.equal('$0.64');
		});

		it('should calculate price of 1,760,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1760000,
					),
				),
			).to.equal('$0.63');
		});

		it('should calculate price of 1,970,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1970000,
					),
				),
			).to.equal('$0.62');
		});

		it('should calculate price of 2,200,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						2200000,
					),
				),
			).to.equal('$0.61');
		});

		it('should calculate price of 2,470,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						2470000,
					),
				),
			).to.equal('$0.59');
		});
	});
});

describe('getCreditTotalPrice()', function () {
	it('should throw on invalid feature slug', function () {
		expect(() => {
			pricing.getCreditTotalPrice('buz-bar', 0, 1);
		}).to.throw('Feature buz-bar not supported for credits');
	});

	it('should throw on negative available credits', function () {
		expect(() => {
			pricing.getCreditTotalPrice(FEATURE_SLUG, -1, 0);
		}).to.throw('Available credits must be greater than or equal to 0');
	});

	it('should throw on negative purchase amount', function () {
		expect(() => {
			pricing.getCreditTotalPrice(FEATURE_SLUG, 0, -1);
		}).to.throw('Credit purchase amount must be greater than 0');
	});

	describe('should respect constructor target options', function () {
		it('should calculate using "current" version by default', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
			});

			// Should be using version 2 in this case.
			expect(
				toDollar(instance.getCreditTotalPrice(FEATURE_SLUG, 0, 1000)),
			).to.equal('$1,950.00');
		});

		it('should calculate using "current" version by when target is "current"', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: 'current',
			});

			// Should be using version 2 in this case.
			expect(
				toDollar(instance.getCreditTotalPrice(FEATURE_SLUG, 0, 1000)),
			).to.equal('$1,950.00');
		});

		it('should calculate using "latest" version by when target is "latest"', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: 'latest',
			});

			// Should be using version 3 in this case.
			expect(
				toDollar(instance.getCreditTotalPrice(FEATURE_SLUG, 0, 1000)),
			).to.equal('$2,040.00');
		});

		it('should calculate using specified version by when target is a number', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: 1,
			});

			// Should be using version 1 in this case.
			expect(
				toDollar(instance.getCreditTotalPrice(FEATURE_SLUG, 0, 1000)),
			).to.equal('$1,460.00');
		});

		it('should calculate using version valid up to given date by when target is a date', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: new Date(now - 60 * 60 * 2),
			});

			// Should be using version 1 in this case.
			expect(
				toDollar(instance.getCreditTotalPrice(FEATURE_SLUG, 0, 1000)),
			).to.equal('$1,460.00');
		});
	});

	describe('when available credits are 0', function () {
		it('should throw when credit total is 0', function () {
			expect(() =>
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 0)),
			).to.throw('Credit purchase amount must be greater than 0');
		});

		it('should calculate price of a single credit', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1)),
			).to.equal('$1.99');
		});

		it('should calculate price of 1000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1000)),
			).to.equal('$1,950.00');
		});

		it('should calculate price of 1,000,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1000000)),
			).to.equal('$700,000.00');
		});

		it('should calculate price of 1,050,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1050000)),
			).to.equal('$724,500.00');
		});

		it('should calculate price of 1,160,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1160000)),
			).to.equal('$788,800.00');
		});

		it('should calculate price of 1,280,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1280000)),
			).to.equal('$857,600.00');
		});

		it('should calculate price of 1,420,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1420000)),
			).to.equal('$923,000.00');
		});

		it('should calculate price of 1,580,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1580000)),
			).to.equal('$1,011,200.00');
		});

		it('should calculate price of 1,760,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1760000)),
			).to.equal('$1,108,800.00');
		});

		it('should calculate price of 1,970,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1970000)),
			).to.equal('$1,221,400.00');
		});

		it('should calculate price of 2,200,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 2200000)),
			).to.equal('$1,342,000.00');
		});

		it('should calculate price of 2,470,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 2470000)),
			).to.equal('$1,457,300.00');
		});
	});

	describe('when available credits are at the aggressive discount threshold', function () {
		it('should throw when purchase amount is 0', function () {
			expect(() =>
				toDollar(
					pricing.getCreditTotalPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						0,
					),
				),
			).to.throw('Credit purchase amount must be greater than 0');
		});

		it('should calculate price of a single credit', function () {
			expect(
				toDollar(
					pricing.getCreditTotalPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1,
					),
				),
			).to.equal('$1.50');
		});

		it('should calculate price of 1000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditTotalPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1000,
					),
				),
			).to.equal('$1,480.00');
		});

		it('should calculate price of 1,000,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditTotalPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1000000,
					),
				),
			).to.equal('$690,000.00');
		});

		it('should calculate price of 1,050,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditTotalPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1050000,
					),
				),
			).to.equal('$724,500.00');
		});

		it('should calculate price of 1,160,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditTotalPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1160000,
					),
				),
			).to.equal('$788,800.00');
		});

		it('should calculate price of 1,280,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditTotalPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1280000,
					),
				),
			).to.equal('$844,800.00');
		});

		it('should calculate price of 1,420,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditTotalPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1420000,
					),
				),
			).to.equal('$923,000.00');
		});

		it('should calculate price of 1,580,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditTotalPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1580000,
					),
				),
			).to.equal('$1,011,200.00');
		});

		it('should calculate price of 1,760,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditTotalPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1760000,
					),
				),
			).to.equal('$1,108,800.00');
		});

		it('should calculate price of 1,970,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditTotalPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1970000,
					),
				),
			).to.equal('$1,221,400.00');
		});

		it('should calculate price of 2,200,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditTotalPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						2200000,
					),
				),
			).to.equal('$1,342,000.00');
		});

		it('should calculate price of 2,470,000 credits', function () {
			expect(
				toDollar(
					pricing.getCreditTotalPrice(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						2470000,
					),
				),
			).to.equal('$1,457,300.00');
		});
	});

	it('should be monotonically increasing until it throws an exception when the the max credits cap is reached ', function () {
		let lastResult: number | undefined;
		let i = 1;
		let error: Error | undefined;
		try {
			for (; i < 20; i++) {
				const creditsToBuy = 10 ** i / 2;
				const currentCredits = creditsToBuy;
				const result = pricing.getCreditTotalPrice(
					FEATURE_SLUG,
					currentCredits,
					creditsToBuy,
				);
				if (lastResult != null) {
					expect(result).to.be.greaterThan(lastResult);
				}
				lastResult = result;
			}
		} catch (err) {
			error = err;
		}
		expect(10 ** i).to.be.greaterThan(1_000_000_000_000); // A trillion
		expect(error)
			.to.be.an.instanceof(InvalidParametersError)
			.that.has.property(
				'message',
				'The provided quantity surpasses the maximum supported amount of credits',
			);
	});
});

describe('getDiscountOverDynamic()', function () {
	it('should throw on invalid feature slug', function () {
		expect(() => {
			pricing.getDiscountOverDynamic('buz-bar', 0, 1, dynamicPriceCents);
		}).to.throw('Feature buz-bar not supported for credits');
	});

	it('should throw on negative available credits', function () {
		expect(() => {
			pricing.getDiscountOverDynamic(FEATURE_SLUG, -1, 0, dynamicPriceCents);
		}).to.throw('Available credits must be greater than or equal to 0');
	});

	it('should throw on negative purchase amount', function () {
		expect(() => {
			pricing.getDiscountOverDynamic(FEATURE_SLUG, 0, -1, dynamicPriceCents);
		}).to.throw('Credit purchase amount must be greater than 0');
	});

	describe('should respect constructor target options', function () {
		it('should calculate using "current" version by default', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
			});

			// Should be using version 2 in this case.
			expect(
				`${instance.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1000,
					dynamicPriceCents,
				)}%`,
			).to.equal('3%');
		});

		it('should calculate using "current" version by when target is "current"', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: 'current',
			});

			// Should be using version 2 in this case.
			expect(
				`${instance.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1000,
					dynamicPriceCents,
				)}%`,
			).to.equal('3%');
		});

		it('should calculate using "latest" version by when target is "latest"', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: 'latest',
			});

			// Should be using version 3 in this case.
			expect(
				`${instance.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1000,
					dynamicPriceCents,
				)}%`,
			).to.equal('-2%');
		});

		it('should calculate using specified version by when target is a number', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: 1,
			});

			// Should be using version 1 in this case.
			expect(
				`${instance.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1000,
					dynamicPriceCents,
				)}%`,
			).to.equal('27%');
		});

		it('should calculate using version valid up to given date by when target is a date', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: new Date(now - 60 * 60 * 2),
			});

			// Should be using version 1 in this case.
			expect(
				`${instance.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1000,
					dynamicPriceCents,
				)}%`,
			).to.equal('27%');
		});
	});

	describe('when available credits are 0', function () {
		it('should calculate discount for a single credit', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1,
					dynamicPriceCents,
				)}%`,
			).to.equal('1%');
		});

		it('should calculate discount for 1000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1000,
					dynamicPriceCents,
				)}%`,
			).to.equal('3%');
		});

		it('should calculate price of 1,000,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1000000,
					dynamicPriceCents,
				)}%`,
			).to.equal('65%');
		});

		it('should calculate price of 1,050,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1050000,
					dynamicPriceCents,
				)}%`,
			).to.equal('66%');
		});

		it('should calculate price of 1,160,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1160000,
					dynamicPriceCents,
				)}%`,
			).to.equal('66%');
		});

		it('should calculate price of 1,280,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1280000,
					dynamicPriceCents,
				)}%`,
			).to.equal('67%');
		});

		it('should calculate price of 1,420,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1420000,
					dynamicPriceCents,
				)}%`,
			).to.equal('68%');
		});

		it('should calculate price of 1,580,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1580000,
					dynamicPriceCents,
				)}%`,
			).to.equal('68%');
		});

		it('should calculate price of 1,760,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1760000,
					dynamicPriceCents,
				)}%`,
			).to.equal('69%');
		});

		it('should calculate price of 1,970,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1970000,
					dynamicPriceCents,
				)}%`,
			).to.equal('69%');
		});

		it('should calculate price of 2,200,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					2200000,
					dynamicPriceCents,
				)}%`,
			).to.equal('70%');
		});

		it('should calculate price of 2,470,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					2470000,
					dynamicPriceCents,
				)}%`,
			).to.equal('71%');
		});
	});

	describe('when available credits are at the aggressive discount threshold', function () {
		it('should calculate discount for a single credit', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1,
					dynamicPriceCents,
				)}%`,
			).to.equal('25%');
		});

		it('should calculate discount for 1000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1000,
					dynamicPriceCents,
				)}%`,
			).to.equal('26%');
		});

		it('should calculate discount for 1,000,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1000000,
					dynamicPriceCents,
				)}%`,
			).to.equal('66%');
		});

		it('should calculate discount for 1,050,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1050000,
					dynamicPriceCents,
				)}%`,
			).to.equal('66%');
		});

		it('should calculate discount for 1,160,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1160000,
					dynamicPriceCents,
				)}%`,
			).to.equal('66%');
		});

		it('should calculate discount for 1,280,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1280000,
					dynamicPriceCents,
				)}%`,
			).to.equal('67%');
		});

		it('should calculate discount for 1,420,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1420000,
					dynamicPriceCents,
				)}%`,
			).to.equal('68%');
		});

		it('should calculate discount for 1,580,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1580000,
					dynamicPriceCents,
				)}%`,
			).to.equal('68%');
		});

		it('should calculate discount for 1,760,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1760000,
					dynamicPriceCents,
				)}%`,
			).to.equal('69%');
		});

		it('should calculate discount for 1,970,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1970000,
					dynamicPriceCents,
				)}%`,
			).to.equal('69%');
		});

		it('should calculate discount for 2,200,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					2200000,
					dynamicPriceCents,
				)}%`,
			).to.equal('70%');
		});

		it('should calculate discount for 2,470,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					2470000,
					dynamicPriceCents,
				)}%`,
			).to.equal('71%');
		});
	});
});

describe('getTotalSavings()', function () {
	it('should throw on invalid feature slug', function () {
		expect(() => {
			pricing.getTotalSavings('buz-bar', 0, 1, dynamicPriceCents);
		}).to.throw('Feature buz-bar not supported for credits');
	});

	it('should throw on negative available credits', function () {
		expect(() => {
			pricing.getTotalSavings(FEATURE_SLUG, -1, 0, dynamicPriceCents);
		}).to.throw('Available credits must be greater than or equal to 0');
	});

	it('should throw on negative purchase amount', function () {
		expect(() => {
			pricing.getTotalSavings(FEATURE_SLUG, 0, -1, dynamicPriceCents);
		}).to.throw('Credit purchase amount must be greater than 0');
	});

	describe('should respect constructor target options', function () {
		it('should calculate using "current" version by default', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
			});

			// Should be using version 2 in this case.
			expect(
				toDollar(
					instance.getTotalSavings(FEATURE_SLUG, 0, 1000, dynamicPriceCents),
				),
			).to.equal('$50.00');
		});

		it('should calculate using "current" version by when target is "current"', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: 'current',
			});

			// Should be using version 2 in this case.
			expect(
				toDollar(
					instance.getTotalSavings(FEATURE_SLUG, 0, 1000, dynamicPriceCents),
				),
			).to.equal('$50.00');
		});

		it('should calculate using "latest" version by when target is "latest"', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: 'latest',
			});

			// Should be using version 3 in this case.
			expect(
				toDollar(
					instance.getTotalSavings(FEATURE_SLUG, 0, 1000, dynamicPriceCents),
				),
			).to.equal('-$40.00');
		});

		it('should calculate using specified version by when target is a number', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: 1,
			});

			// Should be using version 1 in this case.
			expect(
				toDollar(
					instance.getTotalSavings(FEATURE_SLUG, 0, 1000, dynamicPriceCents),
				),
			).to.equal('$540.00');
		});

		it('should calculate using version valid up to given date by when target is a date', function () {
			const instance = new CreditPricing({
				credits: TEST_CREDITS,
				target: new Date(now - 60 * 60 * 2),
			});

			// Should be using version 1 in this case.
			expect(
				toDollar(
					instance.getTotalSavings(FEATURE_SLUG, 0, 1000, dynamicPriceCents),
				),
			).to.equal('$540.00');
		});
	});

	describe('when available credits are 0', function () {
		it('should calculate total savings for a single credit', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1, dynamicPriceCents),
				),
			).to.equal('$0.01');
		});

		it('should calculate total savings for 1000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1000, dynamicPriceCents),
				),
			).to.equal('$50.00');
		});

		it('should calculate total savings for 1,000,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1000000, dynamicPriceCents),
				),
			).to.equal('$1,300,000.00');
		});

		it('should calculate total savings for 1,050,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1050000, dynamicPriceCents),
				),
			).to.equal('$1,375,500.00');
		});

		it('should calculate total savings for 1,160,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1160000, dynamicPriceCents),
				),
			).to.equal('$1,531,200.00');
		});

		it('should calculate total savings for 1,280,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1280000, dynamicPriceCents),
				),
			).to.equal('$1,702,400.00');
		});

		it('should calculate total savings for 1,420,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1420000, dynamicPriceCents),
				),
			).to.equal('$1,917,000.00');
		});

		it('should calculate total savings for 1,580,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1580000, dynamicPriceCents),
				),
			).to.equal('$2,148,800.00');
		});

		it('should calculate total savings for 1,760,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1760000, dynamicPriceCents),
				),
			).to.equal('$2,411,200.00');
		});

		it('should calculate total savings for 1,970,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1970000, dynamicPriceCents),
				),
			).to.equal('$2,718,600.00');
		});

		it('should calculate total savings for 2,200,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 2200000, dynamicPriceCents),
				),
			).to.equal('$3,058,000.00');
		});

		it('should calculate total savings for 2,470,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 2470000, dynamicPriceCents),
				),
			).to.equal('$3,482,700.00');
		});
	});

	describe('when available credits are at the aggressive discount threshold', function () {
		it('should calculate total savings for a single credit', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1,
						dynamicPriceCents,
					),
				),
			).to.equal('$0.50');
		});

		it('should calculate total savings for 1000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1000,
						dynamicPriceCents,
					),
				),
			).to.equal('$520.00');
		});

		it('should calculate total savings for 1,000,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1000000,
						dynamicPriceCents,
					),
				),
			).to.equal('$1,310,000.00');
		});

		it('should calculate total savings for 1,050,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1050000,
						dynamicPriceCents,
					),
				),
			).to.equal('$1,375,500.00');
		});

		it('should calculate total savings for 1,160,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1160000,
						dynamicPriceCents,
					),
				),
			).to.equal('$1,531,200.00');
		});

		it('should calculate total savings for 1,280,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1280000,
						dynamicPriceCents,
					),
				),
			).to.equal('$1,715,200.00');
		});

		it('should calculate total savings for 1,420,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1420000,
						dynamicPriceCents,
					),
				),
			).to.equal('$1,917,000.00');
		});

		it('should calculate total savings for 1,580,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1580000,
						dynamicPriceCents,
					),
				),
			).to.equal('$2,148,800.00');
		});

		it('should calculate total savings for 1,760,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1760000,
						dynamicPriceCents,
					),
				),
			).to.equal('$2,411,200.00');
		});

		it('should calculate total savings for 1,970,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						1970000,
						dynamicPriceCents,
					),
				),
			).to.equal('$2,718,600.00');
		});

		it('should calculate total savings for 2,200,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						2200000,
						dynamicPriceCents,
					),
				),
			).to.equal('$3,058,000.00');
		});

		it('should calculate total savings for 2,470,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(
						FEATURE_SLUG,
						testCredit.discountThreshold,
						2470000,
						dynamicPriceCents,
					),
				),
			).to.equal('$3,482,700.00');
		});
	});
});
