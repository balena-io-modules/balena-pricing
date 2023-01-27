import { expect } from 'chai';
import { CreditPricing, CREDITS, InvalidParametersError } from '../src';

const dynamicPriceCents = 150;
const FEATURE_SLUG = 'foo:bar';
const TEST_CREDITS = {
	[FEATURE_SLUG]: {
		firstDiscountPriceCents: 149,
		discountRate: 0.33,
		discountThreshold: 12000,
		discountThresholdPriceCents: 125,
	},
};

const pricing = new CreditPricing(TEST_CREDITS);
const testCredit = TEST_CREDITS[FEATURE_SLUG];
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

describe('getPricing()', function () {
	it('should use passed in credit pricing', function () {
		const custom = new CreditPricing(TEST_CREDITS);
		expect(custom.credits).to.equal(TEST_CREDITS);
	});

	it('should use default credit pricing if custom not specified', function () {
		const standard = new CreditPricing();
		expect(standard.credits).to.equal(CREDITS);
	});
});

describe('getCreditPrice()', function () {
	it('should throw on negative available credits', function () {
		expect(() => {
			pricing.getCreditPrice(FEATURE_SLUG, -1, 0);
		}).to.throw('Available credits must be greater than or equal to 0');
	});

	it('should throw on negative purchase amount', function () {
		expect(() => {
			pricing.getCreditPrice(FEATURE_SLUG, 0, -1);
		}).to.throw('Credit purchase amount must be greater than 0');
	});

	describe('when available credits are 0', function () {
		it('should throw when purchase amount is 0', function () {
			expect(() =>
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 0)),
			).to.throw('Credit purchase amount must be greater than 0');
		});

		it('should calculate price of a single credit', function () {
			expect(toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1))).to.equal(
				'$1.49',
			);
		});

		it('should calculate price of 1000 credits', function () {
			expect(toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1000))).to.equal(
				'$1.47',
			);
		});

		it('should calculate price of 1,000,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1000000)),
			).to.equal('$0.58');
		});

		it('should calculate price of 1,050,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1050000)),
			).to.equal('$0.57');
		});

		it('should calculate price of 1,160,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1160000)),
			).to.equal('$0.56');
		});

		it('should calculate price of 1,280,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1280000)),
			).to.equal('$0.55');
		});

		it('should calculate price of 1,420,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1420000)),
			).to.equal('$0.54');
		});

		it('should calculate price of 1,580,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1580000)),
			).to.equal('$0.53');
		});

		it('should calculate price of 1,760,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1760000)),
			).to.equal('$0.52');
		});

		it('should calculate price of 1,970,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 1970000)),
			).to.equal('$0.51');
		});

		it('should calculate price of 2,200,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 2200000)),
			).to.equal('$0.50');
		});

		it('should calculate price of 2,470,000 credits', function () {
			expect(
				toDollar(pricing.getCreditPrice(FEATURE_SLUG, 0, 2470000)),
			).to.equal('$0.49');
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
			).to.equal('$1.25');
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
			).to.equal('$1.23');
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
			).to.equal('$0.58');
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
			).to.equal('$0.57');
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
			).to.equal('$0.56');
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
			).to.equal('$0.55');
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
			).to.equal('$0.54');
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
			).to.equal('$0.53');
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
			).to.equal('$0.52');
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
			).to.equal('$0.51');
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
			).to.equal('$0.50');
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
			).to.equal('$0.49');
		});
	});
});

describe('getCreditTotalPrice()', function () {
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

	describe('when available credits are 0', function () {
		it('should throw when credit total is 0', function () {
			expect(() =>
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 0)),
			).to.throw('Credit purchase amount must be greater than 0');
		});

		it('should calculate price of a single credit', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1)),
			).to.equal('$1.49');
		});

		it('should calculate price of 1000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1000)),
			).to.equal('$1,470.00');
		});

		it('should calculate price of 1,000,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1000000)),
			).to.equal('$580,000.00');
		});

		it('should calculate price of 1,050,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1050000)),
			).to.equal('$598,500.00');
		});

		it('should calculate price of 1,160,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1160000)),
			).to.equal('$649,600.00');
		});

		it('should calculate price of 1,280,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1280000)),
			).to.equal('$704,000.00');
		});

		it('should calculate price of 1,420,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1420000)),
			).to.equal('$766,800.00');
		});

		it('should calculate price of 1,580,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1580000)),
			).to.equal('$837,400.00');
		});

		it('should calculate price of 1,760,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1760000)),
			).to.equal('$915,200.00');
		});

		it('should calculate price of 1,970,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 1970000)),
			).to.equal('$1,004,700.00');
		});

		it('should calculate price of 2,200,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 2200000)),
			).to.equal('$1,100,000.00');
		});

		it('should calculate price of 2,470,000 credits', function () {
			expect(
				toDollar(pricing.getCreditTotalPrice(FEATURE_SLUG, 0, 2470000)),
			).to.equal('$1,210,300.00');
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
			).to.equal('$1.25');
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
			).to.equal('$1,230.00');
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
			).to.equal('$580,000.00');
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
			).to.equal('$598,500.00');
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
			).to.equal('$649,600.00');
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
			).to.equal('$704,000.00');
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
			).to.equal('$766,800.00');
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
			).to.equal('$837,400.00');
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
			).to.equal('$915,200.00');
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
			).to.equal('$1,004,700.00');
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
			).to.equal('$1,100,000.00');
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
			).to.equal('$1,210,300.00');
		});
	});

	it('should be monotonically increasing until it throws an exception when the the max credits cap is reached ', function () {
		let lastResult: number | undefined;
		let i = 0;
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
			).to.equal('2%');
		});

		it('should calculate price of 1,000,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1000000,
					dynamicPriceCents,
				)}%`,
			).to.equal('61%');
		});

		it('should calculate price of 1,050,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1050000,
					dynamicPriceCents,
				)}%`,
			).to.equal('62%');
		});

		it('should calculate price of 1,160,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1160000,
					dynamicPriceCents,
				)}%`,
			).to.equal('63%');
		});

		it('should calculate price of 1,280,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1280000,
					dynamicPriceCents,
				)}%`,
			).to.equal('63%');
		});

		it('should calculate price of 1,420,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1420000,
					dynamicPriceCents,
				)}%`,
			).to.equal('64%');
		});

		it('should calculate price of 1,580,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1580000,
					dynamicPriceCents,
				)}%`,
			).to.equal('65%');
		});

		it('should calculate price of 1,760,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1760000,
					dynamicPriceCents,
				)}%`,
			).to.equal('65%');
		});

		it('should calculate price of 1,970,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					1970000,
					dynamicPriceCents,
				)}%`,
			).to.equal('66%');
		});

		it('should calculate price of 2,200,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					2200000,
					dynamicPriceCents,
				)}%`,
			).to.equal('67%');
		});

		it('should calculate price of 2,470,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					0,
					2470000,
					dynamicPriceCents,
				)}%`,
			).to.equal('67%');
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
			).to.equal('17%');
		});

		it('should calculate discount for 1000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1000,
					dynamicPriceCents,
				)}%`,
			).to.equal('18%');
		});

		it('should calculate discount for 1,000,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1000000,
					dynamicPriceCents,
				)}%`,
			).to.equal('61%');
		});

		it('should calculate discount for 1,050,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1050000,
					dynamicPriceCents,
				)}%`,
			).to.equal('62%');
		});

		it('should calculate discount for 1,160,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1160000,
					dynamicPriceCents,
				)}%`,
			).to.equal('63%');
		});

		it('should calculate discount for 1,280,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1280000,
					dynamicPriceCents,
				)}%`,
			).to.equal('63%');
		});

		it('should calculate discount for 1,420,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1420000,
					dynamicPriceCents,
				)}%`,
			).to.equal('64%');
		});

		it('should calculate discount for 1,580,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1580000,
					dynamicPriceCents,
				)}%`,
			).to.equal('65%');
		});

		it('should calculate discount for 1,760,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1760000,
					dynamicPriceCents,
				)}%`,
			).to.equal('65%');
		});

		it('should calculate discount for 1,970,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					1970000,
					dynamicPriceCents,
				)}%`,
			).to.equal('66%');
		});

		it('should calculate discount for 2,200,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					2200000,
					dynamicPriceCents,
				)}%`,
			).to.equal('67%');
		});

		it('should calculate discount for 2,470,000 credits', function () {
			expect(
				`${pricing.getDiscountOverDynamic(
					FEATURE_SLUG,
					testCredit.discountThreshold,
					2470000,
					dynamicPriceCents,
				)}%`,
			).to.equal('67%');
		});
	});
});

describe('getTotalSavings()', function () {
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
			).to.equal('$30.00');
		});

		it('should calculate total savings for 1,000,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1000000, dynamicPriceCents),
				),
			).to.equal('$920,000.00');
		});

		it('should calculate total savings for 1,050,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1050000, dynamicPriceCents),
				),
			).to.equal('$976,500.00');
		});

		it('should calculate total savings for 1,160,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1160000, dynamicPriceCents),
				),
			).to.equal('$1,090,400.00');
		});

		it('should calculate total savings for 1,280,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1280000, dynamicPriceCents),
				),
			).to.equal('$1,216,000.00');
		});

		it('should calculate total savings for 1,420,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1420000, dynamicPriceCents),
				),
			).to.equal('$1,363,200.00');
		});

		it('should calculate total savings for 1,580,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1580000, dynamicPriceCents),
				),
			).to.equal('$1,532,600.00');
		});

		it('should calculate total savings for 1,760,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1760000, dynamicPriceCents),
				),
			).to.equal('$1,724,800.00');
		});

		it('should calculate total savings for 1,970,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 1970000, dynamicPriceCents),
				),
			).to.equal('$1,950,300.00');
		});

		it('should calculate total savings for 2,200,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 2200000, dynamicPriceCents),
				),
			).to.equal('$2,200,000.00');
		});

		it('should calculate total savings for 2,470,000 credits', function () {
			expect(
				toDollar(
					pricing.getTotalSavings(FEATURE_SLUG, 0, 2470000, dynamicPriceCents),
				),
			).to.equal('$2,494,700.00');
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
			).to.equal('$0.25');
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
			).to.equal('$270.00');
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
			).to.equal('$920,000.00');
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
			).to.equal('$976,500.00');
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
			).to.equal('$1,090,400.00');
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
			).to.equal('$1,216,000.00');
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
			).to.equal('$1,363,200.00');
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
			).to.equal('$1,532,600.00');
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
			).to.equal('$1,724,800.00');
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
			).to.equal('$1,950,300.00');
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
			).to.equal('$2,200,000.00');
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
			).to.equal('$2,494,700.00');
		});
	});
});
