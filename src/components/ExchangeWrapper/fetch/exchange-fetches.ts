export const URL_BASE = 'https://api.changenow.io/v2/' as const;
export const DEFAULT_HEADERS = {
	'x-changenow-api-key':
		'c9155859d90d239f909d2906233816b26cd8cf5ede44702d422667672b58b0cd',
};

export const URL_ALL_AVAILABLE_CURRENCIES = 'exchange/currencies' as const;
export const URL_MIN_EXCHANGE_AMOUNT = 'exchange/min-amount' as const;
export const URL_ESTIMATED_AMOUNT = 'exchange/estimated-amount' as const;

export function exchangeFetch<T extends { [key: string]: any }>(
	url: string,
	options?: {
		queries?: T;
		requestInit?: RequestInit;
		thenCatch?: (res: Response) => any;
		errorCatch?: (e: any) => void;
	}
): Promise<any> {
	if (!url) return;
	const uri = new URL(url, URL_BASE);
	if (options?.queries)
		for (const query of Object.keys(options.queries))
			uri.searchParams.append(query, options.queries[query]);

	return fetch(uri, {
		redirect: 'follow',
		...options?.requestInit,
		headers: { ...options?.requestInit?.headers, ...DEFAULT_HEADERS },
	})
		.then((res) => options?.thenCatch ?? res.json())
		.catch((e) => options?.errorCatch ?? e);
}
