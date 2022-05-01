import {useAsyncMemo} from 'use-async-memo';

import {maxDeposit, maxTotalBalance} from '../api/bridge';
import {useTransfer} from '../providers/TransferProvider';
import {useMaxDepositCall, useMaxTotalBalanceCall} from './useContractCall';

const cache = {};

export const useMaxDeposit = () => {
  const getMaxDeposit = useMaxDepositCall();
  return useTokenConstant('maxDeposit', getMaxDeposit);
};

export const useMaxTotalBalance = () => {
  const getMaxTotalBalance = useMaxTotalBalanceCall();
  return useTokenConstant('maxTotalBalance', getMaxTotalBalance);
};

const useTokenConstant = (methodName, methodHandler) => {
  const {symbol, isL1, selectedToken} = useTransfer();

  return useAsyncMemo(async () => {
    if (symbol && isL1) {
      cache[methodName] = cache[methodName] || {};
      if (!cache[methodName][symbol]) {
        const value = await methodHandler();
        cache[methodName][symbol] = value;
        return value;
      }
      return cache[methodName][symbol];
    }
    return null;
  }, [symbol, isL1, selectedToken, methodHandler, methodName]);
};
