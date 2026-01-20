import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import {
	CurrencyItemType,
	EstimatedExchangeAmountQueries,
	EstimatedExchangeAmountType,
	MinExchangeAmountType,
} from '../../../types/api/types';
import useExchangeData from './useExchangeData';
import {
	exchangeFetch,
	URL_ALL_AVAILABLE_CURRENCIES,
	URL_ESTIMATED_AMOUNT,
	URL_MIN_EXCHANGE_AMOUNT,
} from '../fetch/exchange-fetches';

jest.mock('../fetch/exchange-fetches', () => {
	const actual = jest.requireActual('../fetch/exchange-fetches');
	return {
		...actual,
		exchangeFetch: jest.fn(),
	};
});

const mockedExchangeFetch = exchangeFetch as unknown as jest.Mock;

function makeCurrencies(): CurrencyItemType[] {
	return [
		{
			ticker: 'btc',
			name: 'Bitcoin',
			image: 'btc.png',
			network: 'btc',
		},
		{
			ticker: 'eth',
			name: 'Ethereum',
			image: 'eth.png',
			network: 'eth',
		},
	];
}

function makeMinAmount(from: CurrencyItemType, to: CurrencyItemType): MinExchangeAmountType {
	return {
		fromCurrency: from.ticker,
		fromNetwork: from.network,
		toCurrency: to.ticker,
		toNetwork: to.network,
		flow: 'standart',
		minAmount: 0.01,
	};
}

function makeEstimatedAmount(
	q: EstimatedExchangeAmountQueries
): EstimatedExchangeAmountType {
	return {
		fromCurrency: q.fromCurrency,
		fromNetwork: q.fromNetwork ?? q.fromCurrency,
		toCurrency: q.toCurrency,
		toNetwork: q.toNetwork ?? q.toCurrency,
		flow: q.flow,
		type: q.type ?? 'direct',
		validUntil: new Date(0).toISOString(),
		fromAmount: q.fromAmount,
		toAmount: q.fromAmount * 2,
	};
}

describe('useExchangeData', () => {
	let consoleErrorSpy: jest.SpyInstance;
	let originalConsoleError: typeof console.error;

	beforeEach(() => {
		mockedExchangeFetch.mockReset();
		originalConsoleError = console.error;
		consoleErrorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation((...args: any[]) => {
				// React 19 sometimes warns for async state updates in hooks even when using waitFor.
				// We keep tests strict on behavior, and silence this known-noise warning.
				const first = args[0];
				if (
					typeof first === 'string' &&
					first.includes('not wrapped in act')
				)
					return;
				originalConsoleError(...args);
			});
	});

	afterEach(() => {
		cleanup();
		jest.clearAllMocks();
		consoleErrorSpy?.mockRestore();
	});

	it('fetches all available currencies on mount', async () => {
		const currencies = makeCurrencies();
		mockedExchangeFetch.mockImplementation((url: string) => {
			if (url === URL_ALL_AVAILABLE_CURRENCIES)
				return Promise.resolve().then(() => currencies);
            // @ts-expect-error
			return Promise.resolve().then(() => null);
		});

		const { result } = renderHook(() => useExchangeData());

		await waitFor(() => {
			expect(result.current.allAvailableCurrencies).toEqual(currencies);
		});

		expect(mockedExchangeFetch).toHaveBeenCalledWith(URL_ALL_AVAILABLE_CURRENCIES);
	});

	it('fetches min exchange amount when both currencies are chosen', async () => {
		const currencies = makeCurrencies();
		const from = currencies[0];
		const to = currencies[1];
		const minAmount = makeMinAmount(from, to);

		mockedExchangeFetch.mockImplementation((url: string) => {
			if (url === URL_ALL_AVAILABLE_CURRENCIES)
				return Promise.resolve().then(() => currencies);
			if (url === URL_MIN_EXCHANGE_AMOUNT)
				return Promise.resolve().then(() => minAmount);
            // @ts-expect-error
			return Promise.resolve().then(() => null);
		});

		const { result } = renderHook(() => useExchangeData());

		await waitFor(() => {
			expect(result.current.allAvailableCurrencies).toEqual(currencies);
		});

		act(() => {
			result.current.currentExchangeOption.setState(from);
			result.current.currentRecieveOption.setState(to);
		});

		await waitFor(() => {
			expect(result.current.minExchangeAmount).toEqual(minAmount);
		});

		expect(mockedExchangeFetch).toHaveBeenCalledWith(URL_MIN_EXCHANGE_AMOUNT, {
			queries: {
				fromCurrency: from.ticker,
				fromNetwork: from.network,
				toCurrency: to.ticker,
				toNetwork: to.network,
			},
		});
	});

	it('reverseCurrencies swaps currentExchangeOption and currentRecieveOption', async () => {
		const currencies = makeCurrencies();
		const from = currencies[0];
		const to = currencies[1];

		mockedExchangeFetch.mockImplementation((url: string) => {
			if (url === URL_ALL_AVAILABLE_CURRENCIES)
				return Promise.resolve().then(() => currencies);
			// avoid min-amount noise for this test
			if (url === URL_MIN_EXCHANGE_AMOUNT)
				return Promise.resolve().then(() => makeMinAmount(to, from));
            // @ts-expect-error
			return Promise.resolve().then(() => null);
		});

		const { result } = renderHook(() => useExchangeData());

		await waitFor(() => {
			expect(result.current.allAvailableCurrencies).toEqual(currencies);
		});

		act(() => {
			result.current.currentExchangeOption.setState(from);
			result.current.currentRecieveOption.setState(to);
		});

		await waitFor(() => {
			expect(result.current.currentExchangeOption.state).toEqual(from);
			expect(result.current.currentRecieveOption.state).toEqual(to);
		});

		act(() => {
			result.current.reverseCurrencies();
		});

		await waitFor(() => {
			expect(result.current.currentExchangeOption.state).toEqual(to);
			expect(result.current.currentRecieveOption.state).toEqual(from);
		});
	});

	it('validates ethereum address and sets/clears error', async () => {
		mockedExchangeFetch.mockImplementation((url: string) => {
			// mount effect
			if (url === URL_ALL_AVAILABLE_CURRENCIES)
				return Promise.resolve().then(() => makeCurrencies());
            // @ts-expect-error
			return Promise.resolve().then(() => null);
		});

		const { result } = renderHook(() => useExchangeData());

		act(() => {
			result.current.ethereumAddress.setState('not-an-eth-address');
		});

		await waitFor(() => {
			expect(result.current.ethereumAddress.error).toBe('invalid address');
		});

		act(() => {
			result.current.ethereumAddress.setState('0x0000000000000000000000000000000000000000');
		});

		await waitFor(() => {
			expect(result.current.ethereumAddress.error).toBe('');
		});

		act(() => {
			result.current.ethereumAddress.setState(null);
		});

		await waitFor(() => {
			expect(result.current.ethereumAddress.error).toBe('');
		});
	});

	it('fetchEstimatedExchangeAmount calls exchangeFetch with URL_ESTIMATED_AMOUNT and returns json', async () => {
		mockedExchangeFetch.mockImplementation((url: string, options?: any) => {
			if (url === URL_ALL_AVAILABLE_CURRENCIES)
				return Promise.resolve().then(() => makeCurrencies());
			if (url === URL_ESTIMATED_AMOUNT)
				return Promise.resolve().then(() => makeEstimatedAmount(options?.queries));
            // @ts-expect-error
			return Promise.resolve().then(() => null);
		});

		const { result } = renderHook(() => useExchangeData());

		const queries: EstimatedExchangeAmountQueries = {
			fromAmount: 1,
			fromCurrency: 'btc',
			fromNetwork: 'btc',
			toCurrency: 'eth',
			toNetwork: 'eth',
			flow: 'standart',
			type: 'direct',
		};

		const json = await result.current.fetchEstimatedExchangeAmount(queries);

		expect(mockedExchangeFetch).toHaveBeenCalledWith(URL_ESTIMATED_AMOUNT, {
			queries,
		});
		expect(json).toEqual(makeEstimatedAmount(queries));
	});
});

