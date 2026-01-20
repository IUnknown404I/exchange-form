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
	const optionsRef = React.useRef<T[]>(options ?? []);

	const [value, setValue] = React.useState<string>('');
	const [showOptions, setShowOptions] = React.useState<boolean>(false);
	const [activeOptionIndex, setActiveOptionIndex] = React.useState<number>(
		initialIndex ?? -1
	);
	const [filteredOptions, setFilteredOptions] = React.useState<T[]>(
		options ?? []
	);
	const [listMaxHeight, setListMaxHeight] = React.useState<number>(252);

	// Pre-compute list height when options open to avoid SSR/window pitfalls
	React.useLayoutEffect(() => {
		if (typeof window === 'undefined' || !showOptions || !containerRef.current)
			return;
		const { top, height } = containerRef.current.getBoundingClientRect();
		const available = window.innerHeight - (top + height) - 25;
		setListMaxHeight(Math.max(Math.min(available, 252), 0));
	}, [showOptions]);

	// update input and common depencies
	const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
		setValue(e.currentTarget.value);
		setActiveOptionIndex(0);
		setShowOptions(true);
		debouncedOptionsFilter(e.currentTarget.value);
		if (currency) setCurrency(null);
	};

	// delayed update options and their dependants according to input value
	const debouncedOptionsFilter = useDebouncedCallback((newValue: string) => {
		const parsedNewValue = newValue.toLowerCase().trim();
		const sourceOptions = optionsRef.current;
		const foundOptions = parsedNewValue
			? sourceOptions.filter(
					(option) =>
						option.name.toLowerCase().includes(parsedNewValue) ||
						option.ticker.toLowerCase().includes(parsedNewValue)
			  )
			: sourceOptions;
		setFilteredOptions(foundOptions);
	}, DEFAULT_DELAY_MS);

	// set active ticker index, value and filtered options according picked one
	const onOptionClick = (
		_: React.MouseEvent<HTMLLIElement, MouseEvent>,
		labelIndex: number
	) => {
		if (
			typeof labelIndex !== 'number' ||
			!filteredOptions.length ||
			labelIndex < 0 ||
			labelIndex >= filteredOptions.length
		)
			return;
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
	const handlePointerDown = React.useCallback(
		(e: PointerEvent) => {
			if (!showOptions) return;
			const path = e.composedPath();
			const clickedInside = path.some(
				(node) =>
					node === containerRef.current || node === iconButtonRef.current
			);
			if (clickedInside) return;
			// check for ticker's name been writed fully
			const parsedValue = value.toLowerCase().trim();
			const index = filteredOptions.findIndex(
				(option) =>
					option.ticker.toLowerCase() === parsedValue ||
					option.name.toLowerCase() === parsedValue
			);
			// clear input and list if needed
			if (index === -1) {
				setValue('');
				setFilteredOptions(optionsRef.current);
			}
			// set input value if user pass valid name but didnt click on ticker item
			else {
				const foundTicker = filteredOptions[index];
				setActiveOptionIndex(index);
				setValue(foundTicker.ticker.toUpperCase());
				setCurrency(foundTicker);
			}
			setShowOptions(false);
		},
		[showOptions, filteredOptions, value, setValue]
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
			if (
				activeOptionIndex < 0 ||
				!filteredOptions.length ||
				activeOptionIndex >= filteredOptions.length
			)
				return;
			const pickedOption = filteredOptions[activeOptionIndex];
			setValue(pickedOption.ticker.toUpperCase());
			setCurrency(pickedOption);
			setShowOptions(false);
			setActiveOptionIndex(0);
			setFilteredOptions(
				filteredOptions.slice(activeOptionIndex, activeOptionIndex + 1)
			);
		}
		function moveCurrentOptionToScreen(index: number) {
			if (!listRef.current) return;
			const optionNode = listRef.current.children[
				index
			] as HTMLLIElement | null;
			optionNode?.scrollIntoView({ block: 'nearest' });
		}
	}

	// subscribe to window click event
	React.useEffect(() => {
		// Listen for outside clicks while dropdown is open
		window.addEventListener('pointerdown', handlePointerDown);
		return () => {
			window.removeEventListener('pointerdown', handlePointerDown);
		};
	}, [handlePointerDown]);

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
					currency.ticker
				);
			}
		}
	}, [currency]);

	React.useEffect(() => {
		optionsRef.current = options ?? [];
		setFilteredOptions(optionsRef.current);
		setActiveOptionIndex((prev) =>
			Math.min(
				Math.max(prev, optionsRef.current.length ? 0 : -1),
				Math.max(optionsRef.current.length - 1, -1)
			)
		);
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
					role='combobox'
					aria-expanded={showOptions}
					aria-controls='autocomplete-list'
				/>
			</div>
			
			<IconButton
				tabIndex={0}
				ref={iconButtonRef}
				aria-label={showOptions ? 'Close list' : 'Open list'}
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
						maxHeight: `${listMaxHeight}px`,
					}}
				/>
			)}
		</div>
	);
};

export default React.memo(Autocomplete);
