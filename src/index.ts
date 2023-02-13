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
	],
};

// Validate credit pricing definitions.
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
