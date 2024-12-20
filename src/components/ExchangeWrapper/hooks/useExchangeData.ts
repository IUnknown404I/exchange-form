import React from 'react';
import {
	CurrencyItemType,
	EstimatedExchangeAmountQueries,
	EstimatedExchangeAmountType,
	isCurrencyItemTypeArray,
	isMinExchangeAmountType,
	MinExchangeAmountQueries,
	MinExchangeAmountType,
} from '../../../types/api/types';
import {
	exchangeFetch,
	URL_ALL_AVAILABLE_CURRENCIES,
	URL_ESTIMATED_AMOUNT,
	URL_MIN_EXCHANGE_AMOUNT,
} from '../fetch/exchange-fetches';

const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/g;

type UseExchangeHookReturnType = {
	currentExchangeOption: {
		state: null | CurrencyItemType;
		setState: React.Dispatch<React.SetStateAction<null | CurrencyItemType>>;
	};
	currentRecieveOption: {
		state: null | CurrencyItemType;
		setState: React.Dispatch<React.SetStateAction<null | CurrencyItemType>>;
	};
	ethereumAddress: {
		state: null | string;
		setState: React.Dispatch<React.SetStateAction<null | string>>;
		error?: null | string;
	};

	allAvailableCurrencies?: null | CurrencyItemType[];
	minExchangeAmount?: null | MinExchangeAmountType;
	fetchEstimatedExchangeAmount: (
		queries: EstimatedExchangeAmountQueries
	) => Promise<EstimatedExchangeAmountType | any>;
	reverseCurrencies: () => void;
};

const useExchangeData = (): UseExchangeHookReturnType => {
	// local varaibles
	const [currentExchangeOption, setCurrentExchangeOption] =
		React.useState<
			UseExchangeHookReturnType['currentExchangeOption']['state']
		>(null);
	const [currentRecieveOption, setCurrentRecieveOption] =
		React.useState<
			UseExchangeHookReturnType['currentRecieveOption']['state']
		>(null);
	const [ethereumAddress, setEthereumAddress] = React.useState<null | string>(
		null
	);
	const [ethereumError, setEthereumError] = React.useState<string>('');
	// fetched variables
	const [allAvailableCurrencies, setAllAvailableAvailableCurrencies] =
		React.useState<null | CurrencyItemType[]>(null);
	const [minExchangeAmount, setMinExchangeAmount] =
		React.useState<null | MinExchangeAmountType>(null);

	// standalone function for out-hook use
	const fetchEstimatedExchangeAmount = React.useCallback(
		async (
			queries: EstimatedExchangeAmountQueries
		): Promise<EstimatedExchangeAmountType | any> =>
			exchangeFetch(URL_ESTIMATED_AMOUNT, { queries })
				.then((json) => json as EstimatedExchangeAmountType)
				.catch((e) => e),
		[]
	);

	const reverseCurrencies = () => {
		setCurrentExchangeOption(currentRecieveOption);
		setCurrentRecieveOption(currentExchangeOption);
	};

	// initial fetching - all curencies
	React.useEffect(() => {
		exchangeFetch(URL_ALL_AVAILABLE_CURRENCIES)
			.then((json) =>
				setAllAvailableAvailableCurrencies(
					isCurrencyItemTypeArray(json) ? json : null
				)
			)
			.catch(() => setAllAvailableAvailableCurrencies(null));
	}, []);

	// both currencies have been chosen -> min exchange amount fetch
	React.useEffect(() => {
		if (!currentExchangeOption || !currentRecieveOption) {
			setMinExchangeAmount(null);
			return;
		}
		exchangeFetch<MinExchangeAmountQueries>(URL_MIN_EXCHANGE_AMOUNT, {
			queries: {
				fromCurrency: currentExchangeOption.ticker,
				fromNetwork: currentExchangeOption.network,
				toCurrency: currentRecieveOption.ticker,
				toNetwork: currentRecieveOption.network,
			},
		})
			.then((json) =>
				setMinExchangeAmount(
					isMinExchangeAmountType(json) ? json : null
				)
			)
			.catch(() => setMinExchangeAmount(null));
	}, [currentExchangeOption, currentRecieveOption]);

	React.useEffect(() => {
		if (!ethereumAddress) {
			if (!!ethereumError) setEthereumError('');
			return;
		}
		if (!ETHEREUM_ADDRESS_REGEX.test(ethereumAddress))
			setEthereumError('invalid address');
		else if (ethereumError) setEthereumError('');
	}, [ethereumAddress]);

	return {
		allAvailableCurrencies,
		minExchangeAmount,
		fetchEstimatedExchangeAmount,
		reverseCurrencies,
		currentExchangeOption: {
			state: currentExchangeOption,
			setState: setCurrentExchangeOption,
		},
		currentRecieveOption: {
			state: currentRecieveOption,
			setState: setCurrentRecieveOption,
		},
		ethereumAddress: {
			state: ethereumAddress,
			setState: setEthereumAddress,
			error: ethereumError,
		},
	};
};

export default useExchangeData;
