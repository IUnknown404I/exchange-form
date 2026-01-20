import React from 'react';
import {
	render,
	screen,
	fireEvent,
	act,
	cleanup,
} from '@testing-library/react';
import Autocomplete, { AutocompleteOptionProps } from '.';

type Option = AutocompleteOptionProps;

function makeOptions(): Option[] {
	return [
		{
			ticker: 'btc',
			name: 'Bitcoin',
			image: 'btc.png',
		},
		{
			ticker: 'eth',
			name: 'Ethereum',
			image: 'eth.png',
		},
		{
			ticker: 'sol',
			name: 'Solana',
			image: 'sol.png',
		},
	];
}

/**
 * Autocomplete renders AutocompleteList, which relies on IntersectionObserver
 * and scrollIntoView/scrollTo. JSDOM doesn't implement them, so we stub here.
 */
class MockIntersectionObserver {
	public observe = jest.fn();
	public unobserve = jest.fn();
	public disconnect = jest.fn();
}

describe('Autocomplete', () => {
	beforeEach(() => {
		jest.useFakeTimers();

		(globalThis as any).IntersectionObserver = jest.fn(
			() => new MockIntersectionObserver() as unknown as IntersectionObserver
		);

		if (!HTMLElement.prototype.scrollIntoView) {
			HTMLElement.prototype.scrollIntoView = jest.fn();
		}
		if (!HTMLElement.prototype.scrollTo) {
			// used inside AutocompleteList on options change
			HTMLElement.prototype.scrollTo = jest.fn();
		}
		// JSDOM might not provide PointerEvent
		if (typeof PointerEvent === 'undefined')
			(globalThis as any).PointerEvent = Event;
	});

	afterEach(() => {
		cleanup();
		jest.clearAllMocks();
		jest.useRealTimers();
	});

	it('opens options on focus and reflects aria state', () => {
		const setCurrency = jest.fn();
		render(
			<Autocomplete
				currency={null}
				setCurrency={setCurrency}
				options={makeOptions()}
			/>
		);

		const input = screen.getByRole('combobox');
		expect(input).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

		fireEvent.focus(input);

		expect(input).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByRole('listbox')).toBeInTheDocument();
		expect(screen.getAllByRole('option')).toHaveLength(3);
	});

	it('filters options after debounce and clears current currency on type', () => {
		const options = makeOptions();
		const setCurrency = jest.fn();
		render(
			<Autocomplete
				currency={options[0]}
				setCurrency={setCurrency}
				options={options}
			/>
		);

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: 'eth' } });

		act(() => {
			jest.advanceTimersByTime(300);
		});

		expect(setCurrency).toHaveBeenCalledWith(null);
		expect(screen.getAllByRole('option')).toHaveLength(1);
		expect(screen.getByRole('option')).toHaveTextContent(/Ethereum/i);
	});

	it('selects an option on click and hides the list', () => {
		const options = makeOptions();
		const setCurrency = jest.fn();
		render(
			<Autocomplete
				currency={null}
				setCurrency={setCurrency}
				options={options}
			/>
		);

		const input = screen.getByRole('combobox');
		fireEvent.focus(input);

		fireEvent.click(screen.getByText('Solana'));

		expect(setCurrency).toHaveBeenCalledWith(options[2]);
		expect(input).toHaveValue('SOL');
		expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		expect(input).toHaveAttribute('aria-expanded', 'false');
	});

	it('allows keyboard navigation and selection with Enter', () => {
		const options = makeOptions();
		const setCurrency = jest.fn();
		render(
			<Autocomplete
				currency={null}
				setCurrency={setCurrency}
				options={options}
			/>
		);

		const input = screen.getByRole('combobox');
		fireEvent.focus(input);

		fireEvent.keyDown(input, { key: 'ArrowDown' });
		fireEvent.keyDown(input, { key: 'Enter' });

		expect(setCurrency).toHaveBeenCalledWith(options[1]);
		expect(input).toHaveValue('ETH');
		expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
	});

	it('closes and clears invalid input when clicking outside', () => {
		const options = makeOptions();
		const setCurrency = jest.fn();
		render(
			<Autocomplete
				currency={null}
				setCurrency={setCurrency}
				options={options}
			/>
		);

		const input = screen.getByRole('combobox');
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: 'unknown coin' } });

		act(() => {
			jest.advanceTimersByTime(300);
		});

		// simulate click outside container
		act(() => {
			window.dispatchEvent(
				new PointerEvent('pointerdown', { bubbles: true } as any)
			);
		});

		expect(input).toHaveValue('');
		expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		expect(setCurrency).not.toHaveBeenCalled();
	});
});
