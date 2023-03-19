import { TypedError } from 'typed-error';

export interface Credit {
	validFrom: Date;
	version: number;
	firstDiscountPriceCents: number;
	discountRate: number;
	discountThreshold: number;
	discountThresholdPriceCents: number;
}

interface Credits {
	[slug: string]: Credit[];
}

interface Options {
	credits?: Credits;
	target?: 'current' | 'latest' | number | Date;
}

interface CreditRange {
	from?: number;
	to?: number;
}

export class InvalidParametersError extends TypedError {
	constructor(message: string) {
		super(message);
	}
}

// Credit pricing definitions.
const CREDITS: Credits = {
	'device:microservices': [
		{
			version: 1,
			validFrom: new Date('2023-02-01T00:00:00Z'),
			firstDiscountPriceCents: 149,
			discountRate: 0.33,
			discountThreshold: 12000,
			discountThresholdPriceCents: 125,
		},
		{
			version: 2,
			validFrom: new Date('2023-03-08T00:00:00Z'),
			firstDiscountPriceCents: 199,
			discountRate: 0.33,
			discountThreshold: 12000,
			discountThresholdPriceCents: 150,
		},
	],
};

/**
 * Validate credit pricing definitions.
 * @param credits - credit pricing definitions
 * @throws {InvalidParametersError} if there are duplicate versions/dates
 *
 * @example
 * validateCredits(CREDITS);
 */
function validateCredits(credits: Credits): void {
	// Assert that there are no duplicate versions/dates.
	for (const [slug, definitions] of Object.entries(credits)) {
		const versions = new Set<number>();
		const validFroms = new Set<string>();
		for (const definition of definitions) {
			if (versions.has(definition.version)) {
				throw new InvalidParametersError(
					`Duplicate version ${definition.version} for feature ${slug}`,
				);
			}

			const validFrom = definition.validFrom.toISOString();
			if (validFroms.has(validFrom)) {
				throw new InvalidParametersError(
					`Duplicate validFrom ${validFrom} for feature ${slug}`,
				);
			}

			versions.add(definition.version);
			validFroms.add(validFrom);
		}
	}
}

/**
 * Get the required credit amount for a given unit cost.
 * @param pricing - credit pricing definition
 * @param unitCost - unit cost
 * @returns number of credits required
 *
 * @example
 * getCreditAmount(CREDITS['device:microservices'][0], 100);
 */
function getCreditAmount(pricing: Credit, unitCost: number): number {
	if (unitCost >= pricing.discountThresholdPriceCents) {
		return (
			((unitCost - pricing.firstDiscountPriceCents) *
				(pricing.discountThreshold - 1)) /
				(pricing.discountThresholdPriceCents -
					pricing.firstDiscountPriceCents) +
			1
		);
	}

	return (
		pricing.discountThreshold *
		10 **
			(Math.log10(unitCost / pricing.discountThresholdPriceCents) /
				Math.log10(1 - pricing.discountRate))
	);
}

/**
 * Sort credit pricing definitions by validFrom date.
 * Sorts from latest to oldest.
 * @param credits - credit pricing definitions
 * @returns sorted credit pricing definitions
 *
 * @example
 * sortCredits(CREDITS);
 */
function sortCredits(credits: Credits): Credits {
	const sortedCredits: Credits = {};
	for (const [slug, definitions] of Object.entries(credits)) {
		sortedCredits[slug] = definitions.sort((a, b) => {
			return b.validFrom.getTime() - a.validFrom.getTime();
		});
	}
	return sortedCredits;
}

export class CreditPricing {
	public credits: { [slug: string]: Credit[] };
	private target: 'current' | 'latest' | number | Date;

	public constructor(options: Options = {}) {
		// Sort and then validate credit pricing definitions.
		this.credits = sortCredits(options.credits ?? CREDITS);
		validateCredits(this.credits);

		// Allow consumers to target one of the following:
		//  'current' - the most recent valid version (default)
		//  'latest' - the latest version, regardless of validity
		//  number - a specific version
		//  Date - the most recent valid version up to a given date
		this.target = options.target ?? 'current';
	}

	/**
	 * Gets and returns pricing for a given feature.
	 * @param featureSlug - feature slug
	 * @returns credit pricing definition
	 *
	 * @example
	 * getDefinition('device:microservices');
	 */
	public getDefinition(featureSlug: string): Credit | undefined {
		if (this.credits[featureSlug] == null) {
			throw new InvalidParametersError(
				`Feature ${featureSlug} not supported for credits`,
			);
		}

		let definition: Credit | undefined;

		// Return latest version of a feature's pricing definition set.
		// This ignores the validFrom date, meaning it can/will return
		// definitions that are scheduled to be valid in the future.
		if (this.target === 'latest') {
			return this.credits[featureSlug][0];
		}

		// Return exact version of a feature's pricing definition set.
		if (typeof this.target === 'number') {
			definition = this.credits[featureSlug].find((credit) => {
				return credit.version === this.target;
			});
			return definition;
		}

		// Return version of a feature's pricing definition set that is
		// valid up to a given date.
		if (this.target instanceof Date) {
			return this.credits[featureSlug].find((def) => {
				return def.validFrom <= this.target;
			});
		}

		// Default to returning the most recent valid version of a
		// feature's pricing definition set.
		return this.credits[featureSlug].find((def) => {
			return def.validFrom <= new Date();
		});
	}

	/**
	 * Adjust a given credit amount to be just over the line to be higher than
	 * the given lower unit cost. This is used to handle rounding edge cases in
	 * which the original range calculations were slightly off.
	 * @param featureSlug - credit feature slug
	 * @param lowerUnitCost - lower unit cost to adjust to
	 * @param amount - starting point credit amount
	 * @returns number of credits needed to be just above the lower unit cost
	 *
	 * @example
	 * fixRange('device:microservices', 198, 1000);
	 */
	private fixRange(
		featureSlug: string,
		lowerUnitCost: number,
		amount: number,
	): number {
		let fixed: number = amount;

		let unitCost = this.getCreditPrice(featureSlug, 0, fixed);

		// Normalize to lower of the two costs.
		// Add credits until unitCost is down to the lowerUnitCost.
		while (unitCost > lowerUnitCost) {
			fixed = fixed + 1;
			unitCost = this.getCreditPrice(featureSlug, 0, fixed);
		}

		// Go back right "over the line" to the higher cost.
		// Reduce credits until unitCost is just higher than the lowerUnitCost.
		while (unitCost === lowerUnitCost) {
			fixed = fixed - 1;
			unitCost = this.getCreditPrice(featureSlug, 0, fixed);
		}

		return fixed;
	}

	/**
	 * Get credit amount range for a given unit cost.
	 * @param featureSlug - feature slug
	 * @param unitCost - unit cost
	 * @returns credit amount range
	 *
	 * @example
	 * getCreditRange('device:microservices', 190);
	 */
	public getCreditRange(featureSlug: string, unitCost: number): CreditRange {
		// Validate unit cost input
		if (!Number.isInteger(unitCost)) {
			throw new InvalidParametersError('Unit cost must be a whole number');
		}
		if (unitCost <= 0) {
			throw new InvalidParametersError('Unit cost must be greater than 0');
		}

		const pricing = this.getDefinition(featureSlug);
		if (pricing == null) {
			throw new InvalidParametersError(
				'Requested feature not allowed for credit usage',
			);
		}

		// Requested unit cost cannot be higher than the first discount price
		if (unitCost > pricing.firstDiscountPriceCents) {
			throw new InvalidParametersError(
				`Unit cost cannot be greater than ${pricing.firstDiscountPriceCents}`,
			);
		}

		const creditRange: CreditRange = {};

		// Can only calculate from if unit cost is less than the first discount price.
		if (unitCost < pricing.firstDiscountPriceCents) {
			creditRange.from = Math.ceil(getCreditAmount(pricing, unitCost + 0.5));
		}

		// Cannot go lower than $0.01 unit cost.
		if (unitCost > 1) {
			creditRange.to = Math.floor(getCreditAmount(pricing, unitCost - 0.5));
		}

		// Handle rounding edge cases where from/to calculation results aren't exactly right.
		if (
			creditRange.from &&
			!(
				this.getCreditPrice(featureSlug, 0, creditRange.from) === unitCost &&
				this.getCreditPrice(featureSlug, 0, creditRange.from - 1) ===
					unitCost + 1
			)
		) {
			creditRange.from =
				this.fixRange(featureSlug, unitCost, creditRange.from) + 1;
		}
		if (
			creditRange.to &&
			!(
				this.getCreditPrice(featureSlug, 0, creditRange.to) === unitCost &&
				this.getCreditPrice(featureSlug, 0, creditRange.to + 1) === unitCost - 1
			)
		) {
			creditRange.to = this.fixRange(featureSlug, unitCost - 1, creditRange.to);
		}

		return creditRange;
	}

	/**
	 * Calculates the price of a credit purchase
	 * @param featureSlug - feature slug
	 * @param availableCredits - total of available and currently accrued credits
	 * @param creditsToPurchase - number of credits to purchase
	 * @returns price of credits for purchase
	 *
	 * @example
	 * getCreditPrice('device:microservices', 0, 25000);
	 */
	public getCreditPrice(
		featureSlug: string,
		availableCredits: number,
		creditsToPurchase: number,
	): number {
		// Assert that credit amounts are valid
		if (!Number.isInteger(availableCredits)) {
			throw new InvalidParametersError(
				'Available credits must be a whole number',
			);
		}
		if (!Number.isInteger(creditsToPurchase)) {
			throw new InvalidParametersError(
				'Credit purchase amount must be a whole number',
			);
		}
		if (availableCredits < 0) {
			throw new InvalidParametersError(
				'Available credits must be greater than or equal to 0',
			);
		}
		if (creditsToPurchase <= 0) {
			throw new InvalidParametersError(
				'Credit purchase amount must be greater than 0',
			);
		}

		const pricing = this.getDefinition(featureSlug);
		if (pricing == null) {
			throw new InvalidParametersError(
				'Requested feature not allowed for credit usage',
			);
		}
		const total = availableCredits + creditsToPurchase;
		if (creditsToPurchase === 0 || total === 0) {
			return 0;
		}
		if (total <= pricing.discountThreshold) {
			return Math.round(
				pricing.firstDiscountPriceCents +
					((pricing.discountThresholdPriceCents -
						pricing.firstDiscountPriceCents) /
						(pricing.discountThreshold - 1)) *
						(total - 1),
			);
		}

		const result = Math.round(
			pricing.discountThresholdPriceCents *
				Math.pow(
					1 - pricing.discountRate,
					Math.log10(total / pricing.discountThreshold),
				),
		);
		if (result <= 0) {
			throw new InvalidParametersError(
				'The provided quantity surpasses the maximum supported amount of credits',
			);
		}
		return result;
	}

	/**
	 * Calculate the total price of a credit purchase
	 * @param featureSlug - feature slug
	 * @param availableCredits - total of available and currently accrued credits
	 * @param creditsToPurchase - number of credits to purchase
	 * @returns total price of credits for purchase
	 *
	 * @example
	 * getCreditTotalPrice('device:microservices', 0, 25000);
	 */
	public getCreditTotalPrice(
		featureSlug: string,
		availableCredits: number,
		creditsToPurchase: number,
	): number {
		return Math.round(
			this.getCreditPrice(featureSlug, availableCredits, creditsToPurchase) *
				creditsToPurchase,
		);
	}

	/**
	 * Calculate discount percentage when compared to dynamic pricing
	 * @param featureSlug - feature slug
	 * @param availableCredits - total of available and currently accrued credits
	 * @param creditsToPurchase - number of credits to purchase
	 * @param dynamicPriceCents - dynamic price in cents
	 * @returns discount percentage
	 *
	 * @example
	 * getDiscountOverDynamic('device:microservices', 0, 25000);
	 */
	public getDiscountOverDynamic(
		featureSlug: string,
		availableCredits: number,
		creditsToPurchase: number,
		dynamicPriceCents: number,
	): number {
		return Math.round(
			((dynamicPriceCents -
				this.getCreditPrice(featureSlug, availableCredits, creditsToPurchase)) /
				dynamicPriceCents) *
				100,
		);
	}

	/**
	 * Calculate the total savings of a credit purchase
	 * @param featureSlug - feature slug
	 * @param availableCredits - total of available and currently accrued credits
	 * @param creditsToPurchase - number of credits to purchase
	 * @param dynamicPriceCents - dynamic price in cents
	 * @returns total savings of credits for purchase
	 *
	 * @example
	 * getTotalSavings('device:microservices', 0, 25000, 100);
	 */
	public getTotalSavings(
		featureSlug: string,
		availableCredits: number,
		creditsToPurchase: number,
		dynamicPriceCents: number,
	): number {
		return Math.round(
			creditsToPurchase *
				(dynamicPriceCents -
					this.getCreditPrice(
						featureSlug,
						availableCredits,
						creditsToPurchase,
					)),
		);
	}
}
