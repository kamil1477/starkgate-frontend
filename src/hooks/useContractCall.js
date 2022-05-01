import {useCallback} from 'react';

import {useAmount, useSelectedToken} from '../providers/TransferProvider';
import {useL1Wallet} from '../providers/WalletsProvider';
import utils from '../utils';
import {useL1TokenBridgeContract, useL1TokenContract, useMaxTotalBalance} from './index';
import {useL1TokenBalance} from './useTokenBalance';

export const useL1ContractCall = () => {
  return useCallback(async (contract, method, ...args) => {
    try {
      return await contract.methods?.[method](...args).call();
    } catch (ex) {
      return Promise.reject(ex);
    }
  }, []);
};

export const useL1BridgeContractCall = method => {
  const callContract = useL1ContractCall();
  const getContract = useL1TokenBridgeContract();
  const selectedToken = useSelectedToken();

  return useCallback(async () => {
    const {decimals, bridgeAddress} = selectedToken;
    const contract = getContract(bridgeAddress);
    const value = await callContract(contract, method);
    return utils.parser.parseFromDecimals(value, decimals);
  }, [method, callContract, getContract, selectedToken]);
};
``;

export const useL1TokenContractCall = method => {
  const callContract = useL1ContractCall();
  const getContract = useL1TokenContract();
  const selectedToken = useSelectedToken();

  return useCallback(
    async (...args) => {
      const {decimals, tokenAddress} = selectedToken;
      const contract = getContract(tokenAddress);
      const value = await callContract(contract, method, ...args);
      return utils.parser.parseFromDecimals(value, decimals);
    },
    [method, callContract, getContract, selectedToken]
  );
};

export const useIsMaxTotalBalanceExceeded = () => {
  const {chainId} = useL1Wallet();
  const getTokenContract = useL1TokenContract();
  const selectedToken = useSelectedToken();
  const maxTotalBalance = useMaxTotalBalance();
  const amount = useAmount();
  const getTokenBridgeBalance = useL1TokenBalance(selectedToken?.bridgeAddress[chainId]);

  return useCallback(async () => {
    const tokenBridgeBalance = await getTokenBridgeBalance(selectedToken);
    return maxTotalBalance < tokenBridgeBalance + Number(amount);
  }, [chainId, getTokenContract, selectedToken, maxTotalBalance, amount, getTokenBridgeBalance]);
};

export const useMaxTotalBalanceCall = () => {
  return useL1BridgeContractCall('maxTotalBalance');
};

export const useMaxDepositCall = () => {
  return useL1BridgeContractCall('maxDeposit');
};

export const useAllowanceCall = () => {
  return useL1TokenContractCall('allowance');
};

export const useL2ContractCall = () => {
  return useCallback(async (contract, method, ...args) => {
    try {
      return await contract.call(method, args);
    } catch (ex) {
      return Promise.reject(ex);
    }
  }, []);
};
