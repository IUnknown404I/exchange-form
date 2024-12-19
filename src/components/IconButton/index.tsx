import React, { HTMLAttributes, RefObject } from 'react';
import styles from './index.module.scss';

interface IconButtonProps
	extends Omit<HTMLAttributes<HTMLButtonElement>, 'disabled' | 'className'> {
	icon: React.ReactNode;
	disabled?: boolean;
	fontSize?: string;
	backgroundColor?: string;
	ref?: RefObject<HTMLButtonElement>;
}

const IconButton: React.FC<IconButtonProps> = (props) => {
	return (
		<button
			{...props}
			disabled={props.disabled}
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
