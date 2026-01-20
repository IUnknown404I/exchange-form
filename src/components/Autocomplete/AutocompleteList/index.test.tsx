import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import AutocompleteList from './index';

type Option = {
	ticker: string;
	name: string;
	image: string;
};

function makeOptions(count: number): Option[] {
	return Array.from({ length: count }, (_, i) => ({
		ticker: `T${i}`,
		name: `Token ${i}`,
		image: `https://example.com/${i}.png`,
	}));
}

/**
 * AutocompleteList uses IntersectionObserver for incremental rendering and
 * `ref.current.scrollTo` on options change. JSDOM doesn't implement those.
 */
class MockIntersectionObserver {
	private callback: IntersectionObserverCallback;
	public observe = jest.fn();
	public unobserve = jest.fn();
	public disconnect = jest.fn();

	constructor(callback: IntersectionObserverCallback) {
		this.callback = callback;
	}

	// helper for tests
	public trigger(isIntersecting: boolean) {
		this.callback(
			[
				{
					isIntersecting,
				} as IntersectionObserverEntry,
			],
			this as unknown as IntersectionObserver
		);
	}
}

describe('AutocompleteList', () => {
	let ioInstance: MockIntersectionObserver | null = null;

	beforeEach(() => {
		ioInstance = null;
		// @ts-expect-error - test stub
		global.IntersectionObserver = jest.fn((cb: IntersectionObserverCallback) => {
			ioInstance = new MockIntersectionObserver(cb);
			return ioInstance as unknown as IntersectionObserver;
		});

		// JSDOM doesn't implement scrollTo for elements; the component uses it on mount.
		if (!HTMLElement.prototype.scrollTo) {
			(HTMLElement.prototype as unknown as { scrollTo: jest.Mock }).scrollTo =
				jest.fn();
		}
	});

	afterEach(() => {
		cleanup();
		jest.clearAllMocks();
	});

	it('renders null when options is empty', () => {
		const listRef = React.createRef<HTMLUListElement>();
		const { container } = render(
			<AutocompleteList
				ref={listRef}
				options={[]}
				activeOptionIndex={-1}
				onClickCallback={jest.fn()}
			/>
		);
		expect(container).toBeEmptyDOMElement();
	});

	it('renders up to 50 options initially and shows loader when more exist', () => {
		const listRef = React.createRef<HTMLUListElement>();
		const options = makeOptions(60);
		render(
			<AutocompleteList
				ref={listRef}
				options={options}
				activeOptionIndex={0}
				onClickCallback={jest.fn()}
			/>
		);

		expect(screen.getAllByRole('option')).toHaveLength(50);
		expect(document.querySelector('#options-loader')).toBeInTheDocument();
	});

	it('applies aria-selected to the active option', () => {
		const listRef = React.createRef<HTMLUListElement>();
		const options = makeOptions(3);
		render(
			<AutocompleteList
				ref={listRef}
				options={options}
				activeOptionIndex={1}
				onClickCallback={jest.fn()}
			/>
		);

		const items = screen.getAllByRole('option');
		expect(items[0]).toHaveAttribute('aria-selected', 'false');
		expect(items[1]).toHaveAttribute('aria-selected', 'true');
		expect(items[2]).toHaveAttribute('aria-selected', 'false');
	});

	it('calls onClickCallback with the clicked index', () => {
		const listRef = React.createRef<HTMLUListElement>();
		const options = makeOptions(3);
		const onClickCallback = jest.fn();
		render(
			<AutocompleteList
				ref={listRef}
				options={options}
				activeOptionIndex={-1}
				onClickCallback={onClickCallback}
			/>
		);

		const items = screen.getAllByRole('option');
		fireEvent.click(items[2]);
		expect(onClickCallback).toHaveBeenCalledTimes(1);
		expect(onClickCallback.mock.calls[0]?.[1]).toBe(2);
	});

	it('resets scroll + render window when options change', () => {
		const listRef = React.createRef<HTMLUListElement>();
		const onClickCallback = jest.fn();
		const optionsA = makeOptions(60);

		const { rerender } = render(
			<AutocompleteList
				ref={listRef}
				options={optionsA}
				activeOptionIndex={0}
				onClickCallback={onClickCallback}
			/>
		);

		// Simulate growing the window via observer
		expect(ioInstance).not.toBeNull();
		act(() => {
			ioInstance!.trigger(true);
		});
		expect(screen.getAllByRole('option')).toHaveLength(60);

		// Spy on scrollTo (provided via prototype stub above)
		const scrollToSpy = jest.spyOn(HTMLElement.prototype, 'scrollTo');

		// Changing options should reset window back to 50 and scroll to top
		const optionsB = makeOptions(60).map((o) => ({
			...o,
			ticker: `N-${o.ticker}`,
		}));
		rerender(
			<AutocompleteList
				ref={listRef}
				options={optionsB}
				activeOptionIndex={0}
				onClickCallback={onClickCallback}
			/>
		);

		expect(scrollToSpy).toHaveBeenCalledWith({ top: 0 });
		expect(screen.getAllByRole('option')).toHaveLength(50);
		expect(document.querySelector('#options-loader')).toBeInTheDocument();
	});

	it('renders more options when the loader intersects and hides loader when fully rendered', () => {
		const listRef = React.createRef<HTMLUListElement>();
		const options = makeOptions(60);
		render(
			<AutocompleteList
				ref={listRef}
				options={options}
				activeOptionIndex={0}
				onClickCallback={jest.fn()}
			/>
		);

		expect(screen.getAllByRole('option')).toHaveLength(50);
		expect(document.querySelector('#options-loader')).toBeInTheDocument();

		expect(ioInstance).not.toBeNull();
		act(() => {
			ioInstance!.trigger(true);
		});

		expect(screen.getAllByRole('option')).toHaveLength(60);
		expect(document.querySelector('#options-loader')).not.toBeInTheDocument();
	});
});

