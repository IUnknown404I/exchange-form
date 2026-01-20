import React from 'react';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import {
	CurrencyItemType,
	isEstimatedExchangeAmounType,
} from '../../types/api/types';
import Autocomplete from '../Autocomplete';
import useExchangeData from './hooks/useExchangeData';
import { ReactComponent as SvgDivider } from './icons/swap.svg';
import styles from './index.module.scss';

const DEFAULT_DELAY_MS = 500 as const;

export type ExchangeWrapperSubmitPropsType = {
	exchangeAmount: number;
	exchangeCurrency: CurrencyItemType;
	recieveAmount: number;
	recieveCurrency: CurrencyItemType;
	ethereumAddress: string;
};

interface ExchangeWrapperI {
	onSubmit?: (
		e: React.FormEvent<HTMLFormElement>,
		data: ExchangeWrapperSubmitPropsType
	) => void;
}

const ExchangeWrapper: React.FC<ExchangeWrapperI> = ({ onSubmit }) => {
	const {
		currentExchangeOption,
		currentRecieveOption,
		minExchangeAmount,
		fetchEstimatedExchangeAmount,
		...exchangeData
	} = useExchangeData();

	// Keep inputs controlled as number or '' per owner request
	const [sourceAmount, setSourceAmount] = React.useState<number | ''>('');
	const [targetAmount, setTargetAmount] = React.useState<number | ''>('');
	const [error, setError] = React.useState<null | {
		text: string;
		placement: 'from' | 'to';
	}>(null);

	// Parse input safely while allowing zero and clearing invalid numbers
	const parseAmount = React.useCallback((value: string): number | '' => {
		const parsed = Number(value);
		if (Number.isNaN(parsed)) return '';
		return parsed;
	}, []);

	React.useEffect(() => {
		if (!minExchangeAmount) {
			setTargetAmount('');
			return;
		} else if (minExchangeAmount.minAmount === null) {
			setTargetAmount('');
			setError({ text: 'this pair is disabled now', placement: 'to' });
			return;
		} else if (error) setError(null);

		setSourceAmount(minExchangeAmount.minAmount);
	}, [minExchangeAmount]);

	// Build latest-safe estimator (memoized to avoid stale closures)
	const updateEstimatedAmount = React.useCallback(() => {
		if (
			!currentRecieveOption ||
			!currentExchangeOption.state ||
			!minExchangeAmount?.minAmount ||
			sourceAmount === ''
		)
			return;

		if (minExchangeAmount.minAmount > (sourceAmount as number)) {
			setError({
				text: `minimal exchange amount is ${minExchangeAmount.minAmount}`,
				placement: 'from',
			});
			return;
		}

		if (error) setError(null);

		fetchEstimatedExchangeAmount({
				fromAmount: sourceAmount as number,
				fromCurrency: currentExchangeOption.state.ticker,
				fromNetwork: currentExchangeOption.state.network,
				toCurrency: currentRecieveOption.state.ticker,
				toNetwork: currentRecieveOption.state.network,
				flow: minExchangeAmount.flow,
				type: 'direct',
			})
			.then((json) => {
				if (!isEstimatedExchangeAmounType(json)) return;
				if (json.toAmount === null) {
					setError({
						text: 'this pair is disabled now',
						placement: 'to',
					});
					return;
				}
				if (error) setError(null);
				setTargetAmount(json.toAmount);
			})
			.catch(() => setTargetAmount(''));
	}, [
		sourceAmount,
		currentExchangeOption.state,
		currentRecieveOption,
		minExchangeAmount,
		error,
	]);

	// Delayed update options and their dependencies according to input value
	const debouncedExchangeAmountUpdate = useDebouncedCallback(
		updateEstimatedAmount,
		DEFAULT_DELAY_MS
	);

	// Update exchange amount when inputs change
	React.useEffect(() => {
		debouncedExchangeAmountUpdate();
	}, [ sourceAmount ]);

	function onSubmitHandler(e: React.FormEvent<HTMLFormElement>) {
		if (!!onSubmit)
			onSubmit(e, {
				exchangeAmount: sourceAmount as number,
				exchangeCurrency: currentExchangeOption.state,
				recieveAmount: targetAmount as number,
				recieveCurrency: currentRecieveOption.state,
				ethereumAddress: exchangeData.ethereumAddress.state,
			});
		else {
			e.preventDefault();
			e.stopPropagation();
		}
	}

	return (
		<form className={styles.container} onSubmit={onSubmitHandler}>
			<div className={styles.exchangeContainer}>
				<div className={styles.fromContainer}>
					<input
						value={sourceAmount}
						onChange={(e) => setSourceAmount(parseAmount(e.target.value))}
						type='number'
						id='source-amount'
						autoComplete='off'
						placeholder='Choose currency and specify the amount'
					/>
					<div className={styles.verticalLine} />
					<Autocomplete
						currency={currentExchangeOption.state}
						setCurrency={
							currentExchangeOption.setState
						}
						options={exchangeData.allAvailableCurrencies ?? []}
						inputProps={{
							id: 'source-currency',
							autoComplete: 'off',
						}}
					/>
					{error?.placement === 'from' && (
						<span className={styles.fromError}>{error.text}</span>
					)}
				</div>

				<SvgDivider onClick={exchangeData.reverseCurrencies} />

				<div className={styles.toContainer}>
					<input
						disabled
						type='number'
						value={targetAmount ?? '-'}
						id='target-amount'
						autoComplete='off'
						placeholder='Choose both currencies'
					/>
					<div className={styles.verticalLine} />
					<Autocomplete
						currency={currentRecieveOption.state}
						setCurrency={currentRecieveOption.setState}
						options={exchangeData.allAvailableCurrencies ?? []}
						inputProps={{
							id: 'target-currency',
							autoComplete: 'off',
						}}
					/>
					{error?.placement === 'to' && (
						<span className={styles.toError}>{error.text}</span>
					)}
				</div>
			</div>

			<div className={styles.submitContainer}>
				<span>Your Ethereum address</span>
				<div>
					<div className={styles.ethereumAddressContainer}>
						<input
							max={512}
							type='text'
							autoComplete='off'
							id='ethereum-address'
							placeholder='Specify your etherium address'
							value={exchangeData.ethereumAddress.state}
							onChange={(e) =>
								exchangeData.ethereumAddress.setState(
									e.currentTarget.value
								)
							}
						/>
						{!!exchangeData.ethereumAddress.error && (
							<span className={styles.addressError}>
								{exchangeData.ethereumAddress.error}
							</span>
						)}
					</div>

					<button
						type='submit'
						disabled={
							!!error ||
							!exchangeData.ethereumAddress.state ||
							!!exchangeData.ethereumAddress.error ||
							!minExchangeAmount
						}
						className={
							!!error ||
							!exchangeData.ethereumAddress.state ||
							!!exchangeData.ethereumAddress.error ||
							!minExchangeAmount
								? styles.submitButtonDisabled
								: styles.submitButton
						}
					>
						exchange
					</button>
				</div>
			</div>
		</form>
	);
};

export default React.memo(ExchangeWrapper);
