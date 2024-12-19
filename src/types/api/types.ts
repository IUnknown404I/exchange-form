// COMMON TYPES //

export type FlowExchangePropType = 'standart' | 'fixed-rate';
export type TypeExchangePropType = 'direct' | 'reverse';

// ALL AVAILABLE CURRENCIES TYPES //

export interface CurrencyItemType {
	ticker: string;
	name: string;
	image: string;
	network: string;
	[key: string]: any;
}
export const isCurrencyItemTypeArray = (
	obj: object[]
): obj is CurrencyItemType[] =>
	Array.isArray(obj) && obj.every(isCurrencyItemType);
export const isCurrencyItemType = (obj: object): obj is CurrencyItemType =>
	typeof obj === 'object' &&
	'ticker' in obj &&
	'name' in obj &&
	'image' in obj &&
	'network' in obj;

// MIN AMOUNT TYPES //

export type MinExchangeAmountQueries = Pick<
	MinExchangeAmountType,
	'fromCurrency' | 'toCurrency'
> &
	Partial<Pick<MinExchangeAmountType, 'fromNetwork' | 'toNetwork'>>;
export interface MinExchangeAmountType {
	fromCurrency: string;
	fromNetwork: string;
	toCurrency: string;
	toNetwork: string;
	flow: FlowExchangePropType;
	minAmount: number;
}
export const isMinExchangeAmountType = (
	obj: object
): obj is MinExchangeAmountType =>
	typeof obj === 'object' &&
	'fromCurrency' in obj &&
	'fromNetwork' in obj &&
	'toCurrency' in obj &&
	'toNetwork' in obj &&
	'flow' in obj &&
	'minAmount' in obj;

// ESTIMATED EXCHANGE AMOUNT TYPES //

export type EstimatedExchangeAmountQueries = Pick<
	EstimatedExchangeAmountType,
	'fromCurrency' | 'toCurrency' | 'flow' | 'fromAmount'
> &
	Partial<
		Pick<EstimatedExchangeAmountType, 'fromNetwork' | 'toNetwork' | 'type'>
	>;
export interface EstimatedExchangeAmountType {
	fromCurrency: string;
	fromNetwork: string;
	toCurrency: string;
	toNetwork: string;
	flow: FlowExchangePropType;
	type: TypeExchangePropType;
	// ? ... other props ... ? //
	validUntil: string;
	fromAmount: number;
	toAmount: number;
}
export const isEstimatedExchangeAmounType = (
	obj: object
): obj is EstimatedExchangeAmountType =>
	typeof obj === 'object' &&
	'fromCurrency' in obj &&
	'fromNetwork' in obj &&
	'toCurrency' in obj &&
	'toNetwork' in obj &&
	'flow' in obj &&
	'type' in obj &&
	'validUntil' in obj &&
	'fromAmount' in obj &&
	'toAmount' in obj;
