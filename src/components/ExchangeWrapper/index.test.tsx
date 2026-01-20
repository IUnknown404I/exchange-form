import React from 'react';
import {
	render,
	screen,
	fireEvent,
	act,
} from '@testing-library/react';
import ExchangeWrapper, {
	ExchangeWrapperSubmitPropsType,
} from '.';
import useExchangeData from './hooks/useExchangeData';

jest.mock('./hooks/useExchangeData');
jest.mock('./icons/swap.svg', () => ({
	ReactComponent: (props: any) => (
		// simple stub to avoid bringing in a potentially pre-bundled React copy
		<div data-testid='svg-divider' {...props} />
	),
}));

const mockedUseExchangeData = useExchangeData as jest.MockedFunction<
	typeof useExchangeData
>;

function makeCurrency(ticker: string, network: string = ticker) {
	return {
		ticker,
		name: ticker.toUpperCase(),
		image: `${ticker}.png`,
		network,
	};
}

function makeHookReturn(overrides: Partial<ReturnType<typeof useExchangeData>> = {}) {
	const btc = makeCurrency('btc');
	const eth = makeCurrency('eth');

	return {
		currentExchangeOption: {
			state: btc,
			setState: jest.fn(),
		},
		currentRecieveOption: {
			state: eth,
			setState: jest.fn(),
		},
		minExchangeAmount: {
			fromCurrency: btc.ticker,
			fromNetwork: btc.network,
			toCurrency: eth.ticker,
			toNetwork: eth.network,
			flow: 'standart',
			minAmount: 0.01,
		},
		allAvailableCurrencies: [btc, eth],
		fetchEstimatedExchangeAmount: jest.fn().mockResolvedValue({
			fromCurrency: btc.ticker,
			fromNetwork: btc.network,
			toCurrency: eth.ticker,
			toNetwork: eth.network,
			flow: 'standart',
			type: 'direct',
			validUntil: new Date(0).toISOString(),
			fromAmount: 0.01,
			toAmount: 0.02,
		}),
		reverseCurrencies: jest.fn(),
		ethereumAddress: {
			state: '0x0000000000000000000000000000000000000000',
			setState: jest.fn(),
			error: '',
		},
		...overrides,
	};
}

describe('ExchangeWrapper', () => {
	let consoleErrorSpy: jest.SpyInstance;
	let originalConsoleError: typeof console.error;

	beforeEach(() => {
		jest.useFakeTimers();
		(mockedUseExchangeData as jest.Mock).mockReturnValue(
			makeHookReturn()
		);

		originalConsoleError = console.error;
		consoleErrorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation((...args: any[]) => {
				// React 19 sometimes warns for async state updates even when tests are behavior-correct.
				// Keep output clean by silencing only the act warning here.
				if (
					args.some(
						(a) =>
							typeof a === 'string' &&
							a.includes('not wrapped in act')
					)
				)
					return;

				originalConsoleError(...args);
			});
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.useRealTimers();
		consoleErrorSpy?.mockRestore();
	});

	it('renders main fields and submit button', () => {
		render(<ExchangeWrapper />);

		expect(
			screen.getByPlaceholderText(
				'Choose currency and specify the amount'
			)
		).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText('Choose both currencies')
		).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText('Specify your etherium address')
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /exchange/i })
		).toBeInTheDocument();
	});

	it('enables submit button when ethereum address and minExchangeAmount are present and no errors', () => {
		render(<ExchangeWrapper />);

		const button = screen.getByRole('button', { name: /exchange/i });
		expect(button).not.toBeDisabled();
	});

	it('disables submit button when ethereum address is empty or has error or minExchangeAmount is missing', () => {
		(mockedUseExchangeData as jest.Mock).mockReturnValue(
			makeHookReturn({
				ethereumAddress: {
					// ExchangeWrapper controls the input value, so avoid null to prevent React warning
					state: '',
					setState: jest.fn(),
					error: 'invalid address',
				},
				minExchangeAmount: null,
			})
		);

		render(<ExchangeWrapper />);

		const button = screen.getByRole('button', { name: /exchange/i });
		expect(button).toBeDisabled();
	});

	it('calls onSubmit with correct payload when form is submitted', async () => {
		const handleSubmit = jest.fn();
		const hookState = makeHookReturn();

		(mockedUseExchangeData as jest.Mock).mockReturnValue(hookState);

		const { container } = render(
			<ExchangeWrapper onSubmit={handleSubmit} />
		);

		// source amount is set from minExchangeAmount via effect
		act(() => {
			jest.runOnlyPendingTimers();
		});

		const form = container.querySelector('form') as HTMLFormElement;
		// const button = screen.getByRole('button', { name: /exchange/i });

		act(() => {
			fireEvent.submit(form);
		});

		expect(handleSubmit).toHaveBeenCalledTimes(1);
		const [, data] = handleSubmit.mock.calls[0] as [
			React.FormEvent<HTMLFormElement>,
			ExchangeWrapperSubmitPropsType
		];

		expect(data.exchangeAmount).toBe(hookState.minExchangeAmount?.minAmount);
		expect(data.exchangeCurrency).toEqual(
			hookState.currentExchangeOption.state
		);
		expect(data.recieveCurrency).toEqual(
			hookState.currentRecieveOption.state
		);
		expect(data.ethereumAddress).toBe(
			hookState.ethereumAddress.state
		);
	});

	it('updates target amount when source changes above min and fetch returns value', async () => {
		const fetchEstimatedExchangeAmount = jest
			.fn()
			.mockResolvedValue({
				fromCurrency: 'btc',
				fromNetwork: 'btc',
				toCurrency: 'eth',
				toNetwork: 'eth',
				flow: 'standart',
				type: 'direct',
				validUntil: new Date(0).toISOString(),
				fromAmount: 1,
				toAmount: 2,
			});

		(mockedUseExchangeData as jest.Mock).mockReturnValue(
			makeHookReturn({
				minExchangeAmount: {
					fromCurrency: 'btc',
					fromNetwork: 'btc',
					toCurrency: 'eth',
					toNetwork: 'eth',
					flow: 'standart',
					minAmount: 1,
				},
				fetchEstimatedExchangeAmount,
			})
		);

		render(<ExchangeWrapper />);

		const sourceInput = screen.getByPlaceholderText(
			'Choose currency and specify the amount'
		) as HTMLInputElement;
		const targetInput = screen.getByPlaceholderText(
			'Choose both currencies'
		) as HTMLInputElement;

		// fireEvent.change(sourceInput, { target: { value: '2' } });

		act(() => {
			fireEvent.change(sourceInput, { target: { value: '2' } });
			jest.advanceTimersByTime(600);
		});

		expect(fetchEstimatedExchangeAmount).toHaveBeenCalled();

		await act(async () => {
			await Promise.resolve();
		});

		expect(targetInput.value).toBe('2');
	});
});

