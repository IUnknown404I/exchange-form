import React, { HTMLAttributes } from 'react';
import { AutocompleteOptionProps } from '..';
import styles from '../index.module.scss';

const DEFAULT_FROM = 50 as const;
const DEFAULT_STEP = 50 as const;

interface AutocompleteListProps<
	T extends AutocompleteOptionProps = AutocompleteOptionProps
> extends Omit<HTMLAttributes<HTMLUListElement>, 'className'> {
	ref: React.RefObject<HTMLUListElement>;
	options: T[];
	activeOptionIndex: number;
	onClickCallback: (
		e: React.MouseEvent<HTMLLIElement, MouseEvent>,
		labelIndex: number
	) => void;
}

const AutocompleteList = <
	T extends AutocompleteOptionProps = AutocompleteOptionProps
>({
	ref,
	options,
	activeOptionIndex,
	onClickCallback,
	...props
}: AutocompleteListProps<T>) => {
	const [toPoint, setToPoint] = React.useState<number>(DEFAULT_FROM);

	// on change incoming options: reset current to-index and scroll to top
	React.useEffect(() => {
		setToPoint(DEFAULT_FROM);
		if (ref.current) ref.current.scrollTo({ top: 0 });
	}, [options]);
	
	// subscribe observer for options dynamic displaying
	React.useLayoutEffect(() => {
		const observer = new IntersectionObserver((entries) => {
			if (!entries[0]) return;
			if (entries[0].isIntersecting)
				setToPoint((prev) => prev + DEFAULT_STEP);
		});
		const element = document.querySelector('#options-loader');
		if (element) observer.observe(element);
		return () => observer.disconnect();
	}, [options]);

	return options.length ? (
		<ul
			{...props}
			ref={ref}
			role='listbox'
			id='autocomplete-list'
			className={styles.optionsList}
		>
			{options?.slice(0, toPoint).map((option, index) => (
				<li
					role='option'
					id={`${option.ticker}-${index}`}
					key={`${option.ticker}-${index}`}
					aria-selected={index === activeOptionIndex}
					className={
						index === activeOptionIndex
							? styles.activeOption
							: styles.option
					}
					onClick={(e) => onClickCallback(e, index)}
				>
					<img src={option.image || null} alt='currency-icon' />
					<strong>{option.ticker}</strong>
					<span>{option.name}</span>
				</li>
			))}
			
			{options?.length > toPoint && (
				<div
					id='options-loader'
					style={{ width: '100%', height: '1px' }}
				/>
			)}
		</ul>
	) : null;
};

export default AutocompleteList;
