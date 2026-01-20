import { resolve as _resolve, join } from 'path';

export const mode = 'none';
export const entry = {
	app: join(__dirname, 'src', 'index.tsx'),
};
export const target = 'web';
export const resolve = {
	extensions: ['.ts', '.tsx', '.js', '.css', '.scss'],
};
export const module = {
	rules: [
		{
			test: /\.tsx?$/,
			use: 'ts-loader',
			exclude: '/node_modules/',
		},
		{
			test: /\.svg$/,
			use: [
				{
					loader: '@svgr/webpack',
					options: {
						native: true,
					},
				},
			],
		},
		{
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "sass-loader",
			api: "modern-compiler",
            options: {
              warnRuleAsWarning: true,
            },
          },
        ],
      },
	],
};
export const output = {
	filename: '[name].js',
	path: _resolve(__dirname, 'dist'),
};
