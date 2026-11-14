import React, { ReactNode } from 'react';
import styles from './ComparacionZonas.module.css';

export default function ComparacionDesktop({ children }: { children: ReactNode }) {
  return <div className={styles.desktop}>{children}</div>;
}
