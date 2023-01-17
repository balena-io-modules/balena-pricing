import { TypedError } from 'typed-error';

export interface Credit {
	firstDiscountPriceCents: number;
	discountRate: number;
	discountThreshold: number;
	discountThresholdPriceCents: number;
}

export class InvalidParametersError extends TypedError {
	constructor(message: string) {
		super(message);
	}
}

// Credit pricing definitions.
// Initially restrict credit usage to device:microservices feature.
export const CREDITS: { [key: string]: Credit } = {
	'device:microservices': {
		firstDiscountPriceCents: 149,
		discountRate: 0.33,
		discountThreshold: 12000,
		discountThresholdPriceCents: 125,
	},
};

/**
 * Gets and returns pricing for a given feature
 * @param featureSlug - feature slug
 * @returns credit pricing parameters
 *
 * @example
 * const pricing = getFeaturePricing({...}, 'device:microservices');
 */
function getFeaturePricing(
	credits: { [key: string]: Credit },
	featureSlug: string,
): Credit {
	const pricing = credits[featureSlug];
	if (pricing == null) {
		throw new InvalidParametersError(
			'Requested feature not allowed for credit usage',
		);
	}
	return pricing;
}

export class CreditPricing {
	public credits: { [key: string]: Credit };

	public constructor(credits = CREDITS) {
		this.credits = credits;
	}

	/**
	 * Calculates the price of a credit purchase
	 * @param featureSlug - feature slug
	 * @param availableCredits - total of available and currently accrued credits
	 * @param creditsToPurchase - number of credits to purchase
	 * @returns price of credits for purchase
	 *
	 * @example
	 * const price = getCreditPrice('device:microservices', 0, 25000);
	 */
	public getCreditPrice(
		featureSlug: string,
		availableCredits: number,
		creditsToPurchase: number,
	): number {
		// Assert that credit amounts are valid
		if (availableCredits < 0) {
			throw new InvalidParametersError('Available credits must be >= 0');
		}
		if (creditsToPurchase < 0) {
			throw new InvalidParametersError('Credit purchase amount must be >= 0');
		}

		const pricing = getFeaturePricing(this.credits, featureSlug);
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

		return Math.round(
			pricing.discountThresholdPriceCents *
				Math.pow(
					1 - pricing.discountRate,
					Math.log10(total / pricing.discountThreshold),
				),
		);
	}

	/**
	 * Calculate the total price of a credit purchase
	 * @param featureSlug - feature slug
	 * @param availableCredits - total of available and currently accrued credits
	 * @param creditsToPurchase - number of credits to purchase
	 * @returns total price of credits for purchase
	 *
	 * @example
	 * const price = getCreditTotalPrice('device:microservices', 0, 25000, 0.1);
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
	 * const discount = getDiscountOverDynamic('device:microservices', 0, 25000);
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
	 * const savings = getTotalSavings('device:microservices', 0, 25000, 0.1);
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
