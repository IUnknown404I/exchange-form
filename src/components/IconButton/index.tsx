import React, { HTMLAttributes, RefObject } from 'react';
import styles from './index.module.scss';

interface IconButtonProps
	extends Omit<HTMLAttributes<HTMLButtonElement>, 'className'> {
	icon: React.ReactNode;
	fontSize?: string;
	backgroundColor?: string;
	ref?: RefObject<HTMLButtonElement>;
}

const IconButton: React.FC<IconButtonProps> = (props) => {
	return (
		<button
			type='button'
			{...props}
			className={styles.iconButton}
			style={{
				width: 'fit-content',
				fontSize: props.fontSize,
				backgroundColor: props.backgroundColor,
				...props.style,
			}}
		>
			{props.icon}
		</button>
	);
};

export default IconButton;
