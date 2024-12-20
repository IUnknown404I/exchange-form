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
	const exchangeData = useExchangeData();

	const [sourceAmount, setSourceAmount] = React.useState<number | ''>('');
	const [targetAmount, setTargetAmount] = React.useState<number | ''>('');
	const [error, setError] = React.useState<null | {
		text: string;
		placement: 'from' | 'to';
	}>(null);

	React.useEffect(() => {
		if (!exchangeData.minExchangeAmount) {
			setTargetAmount('');
			return;
		} else if (exchangeData.minExchangeAmount.minAmount === null) {
			setTargetAmount('');
			setError({ text: 'this pair is disabled now', placement: 'to' });
			return;
		} else if (error) setError(null);

		setSourceAmount(exchangeData.minExchangeAmount.minAmount);
	}, [exchangeData.minExchangeAmount]);

	// delayed update options and their depecies according to input value
	const debouncedExchangeAmountUpdate = useDebouncedCallback(() => {
		if (
			!exchangeData.currentRecieveOption ||
			!exchangeData.minExchangeAmount?.minAmount
		)
			return;
		else if (
			exchangeData.minExchangeAmount.minAmount > (sourceAmount as number)
		) {
			setError({
				text: `minimal exchange amount is ${exchangeData.minExchangeAmount.minAmount}`,
				placement: 'from',
			});
			return;
		} else if (error) setError(null);

		exchangeData
			?.fetchEstimatedExchangeAmount({
				fromAmount: sourceAmount as number,
				fromCurrency: exchangeData.currentExchangeOption.state.ticker,
				fromNetwork: exchangeData.currentExchangeOption.state.network,
				toCurrency: exchangeData.currentRecieveOption.state.ticker,
				toNetwork: exchangeData.currentRecieveOption.state.network,
				flow: exchangeData.minExchangeAmount.flow,
				type: 'direct',
			})
			.then((json) => {
				if (!isEstimatedExchangeAmounType(json)) return;
				else if (json.toAmount === null) {
					setError({
						text: 'this pair is disabled now',
						placement: 'to',
					});
					return;
				} else if (error) setError(null);
				setTargetAmount(json.toAmount);
			})
			.catch(() => setTargetAmount(''));
	}, DEFAULT_DELAY_MS);
	// update exchange amount
	React.useEffect(() => {
		debouncedExchangeAmountUpdate();
	}, [sourceAmount, exchangeData.currentRecieveOption]);

	function onSubmitHandler(e: React.FormEvent<HTMLFormElement>) {
		if (!!onSubmit)
			onSubmit(e, {
				exchangeAmount: sourceAmount as number,
				exchangeCurrency: exchangeData.currentExchangeOption.state,
				recieveAmount: targetAmount as number,
				recieveCurrency: exchangeData.currentRecieveOption.state,
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
						type='number'
						value={sourceAmount}
						onChange={(e) =>
							setSourceAmount(Number(e.target.value) || '')
						}
						id='source-amount'
						autoComplete='off'
						placeholder='Choose currency and specify the amount'
					/>
					<div className={styles.verticalLine} />
					<Autocomplete
						currency={exchangeData.currentExchangeOption.state}
						setCurrency={
							exchangeData.currentExchangeOption.setState
						}
						options={exchangeData.allAvailableCurrencies}
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
						onChange={(e) =>
							setTargetAmount(Number(e.target.value) || '')
						}
						id='target-amount'
						autoComplete='off'
						placeholder='Choose both currencies'
					/>
					<div className={styles.verticalLine} />
					<Autocomplete
						currency={exchangeData.currentRecieveOption.state}
						setCurrency={exchangeData.currentRecieveOption.setState}
						options={exchangeData.allAvailableCurrencies}
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
							!exchangeData.minExchangeAmount
						}
						className={
							!!error ||
							!exchangeData.ethereumAddress.state ||
							!!exchangeData.ethereumAddress.error ||
							!exchangeData.minExchangeAmount
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
