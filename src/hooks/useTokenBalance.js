import {useCallback} from 'react';

import {TransactionStatus} from '../enums';
import {web3} from '../libs';
import {useTransfer} from '../providers/TransferProvider';
import utils from '../utils';
import {useL1TokenContract, useL2TokenContract} from './useContract';
import {useL1ContractCall, useL2ContractCall} from './useContractCall';

export const useTokenBalance = account => {
  const getL2TokenBalance = useL2TokenBalance(account);
  const getL1TokenBalance = useL1TokenBalance(account);
  const {isL1} = useTransfer();
  return useCallback(
    tokenAddresses => {
      return isL1 ? getL1TokenBalance(tokenAddresses) : getL2TokenBalance(tokenAddresses);
    },
    [isL1, getL1TokenBalance, getL2TokenBalance]
  );
};

export const useL2TokenBalance = account => {
  const callContract = useL2ContractCall();
  const getContract = useL2TokenContract();

  return useCallback(
    async tokenData => {
      const {decimals, tokenAddress} = tokenData;
      const contract = getContract(tokenAddress);
      const {balance} = await callContract(contract, 'balanceOf', account, {
        blockIdentifier: TransactionStatus.PENDING.toLowerCase()
      });
      return utils.parser.parseFromUint256(balance, decimals);
    },
    [account, callContract, getContract]
  );
};

export const useL1TokenBalance = account => {
  const callContract = useL1ContractCall();
  const getContract = useL1TokenContract();

  return useCallback(
    async tokenData => {
      const {decimals, tokenAddress} = tokenData;
      const contract = getContract(tokenAddress);
      const balance = await (contract
        ? callContract(contract, 'balanceOf', account)
        : web3.eth.getBalance(account));
      return utils.parser.parseFromDecimals(balance, decimals);
    },
    [account, callContract, getContract]
  );
};
