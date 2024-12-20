import React from 'react';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import IconButton from '../IconButton';
import AutocompleteList from './AutocompleteList';
import styles from './index.module.scss';

const DEFAULT_DELAY_MS = 250 as const;

export type AutocompleteOptionProps = {
	ticker: string;
	name: string;
	image: string;
};

interface AutocompleteProps<
	T extends AutocompleteOptionProps = AutocompleteOptionProps
> {
	currency: T | null;
	setCurrency: React.Dispatch<React.SetStateAction<T | null>>;
	options: T[];
	initialIndex?: number;
	inputProps?: Omit<
		React.InputHTMLAttributes<HTMLInputElement>,
		'type' | 'value' | 'onFocus' | 'onChange' | 'onBlur'
	>;
}

const Autocomplete = <
	T extends AutocompleteOptionProps = AutocompleteOptionProps
>({
	currency,
	setCurrency,
	options,
	initialIndex,
	...props
}: AutocompleteProps<T>) => {
	const listRef = React.useRef<HTMLUListElement>(null);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const iconButtonRef = React.useRef<HTMLButtonElement>(null);

	const [value, setValue] = React.useState<string>('');
	const [showOptions, setShowOptions] = React.useState<boolean>(false);
	const [activeOptionIndex, setActiveOptionIndex] = React.useState<number>(
		initialIndex ?? -1
	);
	const [filteredOptions, setFilteredOptions] = React.useState<T[]>(
		options ?? []
	);

	// update input and common depencies
	const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
		setValue(e.currentTarget.value);
		setActiveOptionIndex(0);
		setShowOptions(true);
		debouncedOptionsFilter(e.currentTarget.value, options);
		if (currency) setCurrency(null);
	};

	// delayed update options and their depecies according to input value
	const debouncedOptionsFilter = useDebouncedCallback(
		(newValue: string, options: T[]) => {
			const parsedNewValue = newValue.toLowerCase().trim();
			const foundOptions = !!parsedNewValue
				? options.filter(
						(ticker) =>
							ticker.name
								.toLowerCase()
								.includes(parsedNewValue) ||
							ticker.ticker.toLowerCase().includes(parsedNewValue)
				  )
				: options;
			setFilteredOptions(foundOptions);
		},
		DEFAULT_DELAY_MS
	);

	// set active ticker index, value and filtered options according picked one
	const onOptionClick = (
		_: React.MouseEvent<HTMLLIElement, MouseEvent>,
		labelIndex: number
	) => {
		if (typeof labelIndex !== 'number') return;
		const pickedOption = filteredOptions[labelIndex];
		setValue(pickedOption.ticker.toUpperCase());
		setCurrency(pickedOption);
		setFilteredOptions(filteredOptions.slice(labelIndex, labelIndex + 1));
		setActiveOptionIndex(0);
		setShowOptions(false);
	};

	// open options list on interaction
	const onFocus: React.FocusEventHandler<HTMLInputElement> = () => {
		if (!showOptions) setShowOptions(true);
	};

	// handle cleaning-operations on click-over the autocomplete component
	const handleClickOver = React.useCallback(
		(e: MouseEvent) => {
			if (!showOptions) return;
			const { target } = e;
			if (
				target instanceof Node &&
				target.parentNode !== containerRef.current &&
				target.parentNode !== iconButtonRef.current &&
				!containerRef.current?.contains(target) &&
				!iconButtonRef.current?.contains(target)
			) {
				// check for ticker's name been writed fully
				const parsedValue = value.toLowerCase().trim();
				const index = filteredOptions.findIndex(
					(ticker) =>
						ticker.ticker.toLowerCase() === parsedValue ||
						ticker.name.toLowerCase() === parsedValue
				);
				// clear input and list if needed
				if (index === -1) {
					setValue('');
					setFilteredOptions(options ?? []);
				}
				// set input value if user pass valid name but didnt click on ticker item
				else {
					const foundTicker = filteredOptions[index];
					setActiveOptionIndex(index);
					setValue(foundTicker.ticker.toUpperCase());
					setCurrency(foundTicker);
				}
				setShowOptions(false);
			}
		},
		[options, showOptions, filteredOptions, value, setValue]
	);

	// handle keys and scrolling-element
	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		const keysInUse = ['ArrowDown', 'ArrowUp', 'Enter', ' '];
		if (!keysInUse.find((key) => key === e.key)) return;
		e.preventDefault();
		switch (e.key) {
			case ' ': {
				setShowOptions((prev) => !prev);
				break;
			}
			case 'Enter': {
				selectCurrentOption();
				break;
			}
			case 'ArrowDown': {
				const newIndex = Math.min(
					activeOptionIndex + 1,
					filteredOptions.length - 1
				);
				setActiveOptionIndex(newIndex);
				moveCurrentOptionToScreen(newIndex);
				break;
			}
			case 'ArrowUp': {
				const newIndex = Math.max(activeOptionIndex - 1, 0);
				setActiveOptionIndex(newIndex);
				moveCurrentOptionToScreen(newIndex);
				break;
			}
		}

		function selectCurrentOption() {
			const pickedOption = filteredOptions[activeOptionIndex];
			setValue(pickedOption.ticker.toUpperCase());
			setCurrency(pickedOption);
			setShowOptions(false);
			setActiveOptionIndex(0);
		}
		function moveCurrentOptionToScreen(index: number) {
			if (!listRef.current) return;
			document
				.querySelector<HTMLLIElement>(
					`#${filteredOptions[index].ticker}-${index}`
				)
				?.scrollIntoView();
		}
	}

	// subscribe to window click event
	React.useEffect(() => {
		window.addEventListener('click', handleClickOver);
		return () => {
			window.removeEventListener('click', handleClickOver);
		};
	}, [handleClickOver]);
	// sync with passed options and changed (by reverse, for example) input value
	React.useEffect(() => {
		if (currency) {
			if (value.toLowerCase() !== currency.ticker) {
				setValue(currency.ticker.toUpperCase());
				const newIndex = options?.findIndex(
					(option) =>
						option.name === currency.name &&
						option.ticker === currency.ticker
				);
				debouncedOptionsFilter(
					currency.ticker,
					options?.slice(newIndex, newIndex + 1) ?? []
				);
			}
		}
	}, [currency]);
	React.useEffect(() => {
		setFilteredOptions(options ?? []);
	}, [options]);

	return (
		<div
			ref={containerRef}
			className={showOptions ? styles.focusedContainer : styles.container}
		>
			<div>
				{currency?.image && (
					<img src={currency.image || null} alt='ticker icon' />
				)}
				<input
					{...props.inputProps}
					type='text'
					value={value}
					placeholder='Search'
					onFocus={onFocus}
					onChange={onChange}
					onKeyDown={handleKeyDown}
					style={{ fontWeight: currency ? 'bold' : 'normal' }}
				/>
			</div>
			<IconButton
				ref={iconButtonRef}
				icon={
					!showOptions ? (
						<img src='icons/arrow.svg' alt='open icon' />
					) : (
						<img src='icons/close.svg' alt='close icon' />
					)
				}
				onClick={() => setShowOptions((prev) => !prev)}
			/>

			{showOptions && (
				<AutocompleteList
					ref={listRef}
					options={filteredOptions}
					activeOptionIndex={activeOptionIndex}
					onClickCallback={onOptionClick}
					style={{
						maxHeight:
							Math.max(
								window
									? window.innerHeight -
											(!!containerRef.current
												? containerRef.current.getBoundingClientRect()
														.top +
												  containerRef.current.getBoundingClientRect()
														.height
												: 0) -
											25
									: 0,
								252
							) + 'px',
					}}
				/>
			)}
		</div>
	);
};

export default React.memo(Autocomplete);
