import {useCallback} from 'react';
import {stark} from 'starknet';

import {getStarknet} from '../libs';
import {useSelectedToken} from '../providers/TransferProvider';
import {useL1Wallet, useL2Wallet} from '../providers/WalletsProvider';
import utils from '../utils';
import {useL1TokenBridgeContract, useL1TokenContract, useL2TokenBridgeContract} from './index';

export const useL2Transaction = () => {
  return useCallback(async (contract, method, args = {}) => {
    try {
      const calldata = stark.compileCalldata(args);
      const transaction = {
        contractAddress: contract.address,
        entrypoint: method,
        calldata
      };
      return await getStarknet().account.execute(transaction);
    } catch (ex) {
      return Promise.reject(ex);
    }
  }, []);
};

export const useL1Transaction = () => {
  return useCallback(async (contract, method, args = [], options = {}, cb = () => {}) => {
    try {
      return await contract.methods?.[method](...args).send(options, cb);
    } catch (ex) {
      return Promise.reject(ex);
    }
  }, []);
};

export const useL2BridgeContractTransaction = method => {
  const sendTransaction = useL2Transaction();
  const getContract = useL2TokenBridgeContract();
  const selectedToken = useSelectedToken();
  const {account} = useL2Wallet();

  return useCallback(
    async args => {
      const contract = getContract(selectedToken.bridgeAddress);
      return sendTransaction(contract, method, args);
    },
    [method, account, sendTransaction, getContract, selectedToken]
  );
};

export const useL1BridgeContractTransaction = method => {
  const sendTransaction = useL1Transaction();
  const getContract = useL1TokenBridgeContract();
  const selectedToken = useSelectedToken();
  const {account} = useL1Wallet();

  return useCallback(
    async ({args, options, emitter}) => {
      const contract = getContract(selectedToken.bridgeAddress);
      return sendTransaction(contract, method, args, {from: account, ...options}, emitter);
    },
    [method, account, sendTransaction, getContract, selectedToken]
  );
};

export const useL1TokenContractTransaction = method => {
  const sendTransaction = useL1Transaction();
  const getContract = useL1TokenContract();
  const selectedToken = useSelectedToken();
  const {account} = useL1Wallet();

  return useCallback(
    async ({args, options, emitter}) => {
      const contract = getContract(selectedToken.tokenAddress);
      return sendTransaction(contract, method, args, {from: account, ...options}, emitter);
    },
    [method, account, sendTransaction, getContract, selectedToken]
  );
};

export const useApproveTransaction = () => {
  const sendTransaction = useL1TokenContractTransaction('approve');

  return useCallback(
    async (spender, value) => {
      return sendTransaction({args: [spender, value]});
    },
    [sendTransaction]
  );
};

export const useDepositTransaction = () => {
  const sendTransaction = useL1BridgeContractTransaction('deposit');
  const selectedToken = useSelectedToken();

  return useCallback(
    async (recipient, amount, emitter) => {
      const {decimals, symbol} = selectedToken;
      const isEthToken = utils.token.isEth(symbol);
      if (isEthToken) {
        return sendTransaction({
          args: [recipient],
          options: {
            value: utils.parser.parseToDecimals(amount, decimals)
          },
          emitter
        });
      }
      return sendTransaction({
        args: [utils.parser.parseToDecimals(amount, decimals), recipient],
        emitter
      });
    },
    [sendTransaction, selectedToken]
  );
};

export const useWithdrawTransaction = () => {
  const sendTransaction = useL1BridgeContractTransaction('withdraw');

  return useCallback(
    async (recipient, amount, tokenData, emitter) => {
      return sendTransaction({
        args: [utils.parser.parseToDecimals(amount, tokenData.decimals), recipient],
        emitter
      });
    },
    [sendTransaction]
  );
};

export const useInitiateWithdrawTransaction = () => {
  const sendTransaction = useL2BridgeContractTransaction('initiate_withdraw');
  const selectedToken = useSelectedToken();

  return useCallback(
    async (recipient, amount) => {
      return sendTransaction({
        l1Recipient: utils.parser.parseToFelt(recipient),
        amount: utils.parser.parseToUint256(amount, selectedToken.decimals)
      });
    },
    [sendTransaction, selectedToken]
  );
};
