import React, {useEffect, useState} from 'react';

import {useVars, useWindowSize} from '../../../hooks';
import {Bridge} from '../../Features';
import {Login} from '../../Features/Login/Login';
import {useWallets} from '../../Features/Wallet/Wallet.hooks';
import styles from './Main.module.scss';

export const Main = () => {
  const windowSize = useWindowSize();
  const {mainOffset} = useVars();
  const {isConnected} = useWallets();
  const [height, setHeight] = useState(null);

  useEffect(() => {
    setHeight(document.body.offsetHeight - mainOffset);
  }, [windowSize]);

  return (
    <main className={styles.main} style={{height}}>
      {isConnected ? <Bridge /> : <Login />}
    </main>
  );
};