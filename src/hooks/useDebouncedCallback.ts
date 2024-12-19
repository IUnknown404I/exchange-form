import React from 'react';

export function useDebouncedCallback<T extends any[]>(
	callback: (...args: T) => void,
	delay: number
): (...args: T) => void {
	const argsRef = React.useRef<T>(null);
	const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>(null);

	const cancel = () =>
		window.clearTimeout(
			timeoutRef.current && (timeoutRef.current as unknown as number)
		);
	React.useEffect(() => cancel, []);

	return function debouncedCallback(...args: T) {
		argsRef.current = args;
		cancel();

		timeoutRef.current = setTimeout(() => {
			if (argsRef.current) callback(...argsRef.current);
		}, delay);
	};
}
