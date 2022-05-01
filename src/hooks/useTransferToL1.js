import {useCallback} from 'react';

import {
  ActionType,
  CompleteTransferToL1Steps,
  stepOf,
  TransactionStatus,
  TransferError,
  TransferStep,
  TransferToL1Steps
} from '../enums';
import {useWithdrawalListener} from '../providers/EventManagerProvider';
import {useL1Token} from '../providers/TokensProvider';
import {useSelectedToken} from '../providers/TransferProvider';
import {useL1Wallet, useL2Wallet} from '../providers/WalletsProvider';
import utils from '../utils';
import {useLogger} from './useLogger';
import {useCompleteTransferToL1Tracking, useTransferToL1Tracking} from './useTracking';
import {useInitiateWithdrawTransaction, useWithdrawTransaction} from './useTransaction';
import {useTransfer} from './useTransfer';
import {useTransferProgress} from './useTransferProgress';

export const useTransferToL1 = () => {
  const logger = useLogger('useTransferToL1');
  const [trackInitiated, trackSuccess, trackError] = useTransferToL1Tracking();
  const {account: l1Account} = useL1Wallet();
  const {account: l2Account, config: l2Config} = useL2Wallet();
  const {handleProgress, handleData, handleError} = useTransfer(TransferToL1Steps);
  const selectedToken = useSelectedToken();
  const progressOptions = useTransferProgress();
  const initiateWithdraw = useInitiateWithdrawTransaction();

  return useCallback(
    async amount => {
      const {name, symbol} = selectedToken;

      try {
        logger.log('TransferToL1 called');
        handleProgress(
          progressOptions.waitForConfirm(
            l2Config.name,
            stepOf(TransferStep.CONFIRM_TX, TransferToL1Steps)
          )
        );
        logger.log('Calling initiate withdraw');
        trackInitiated({
          from_address: l2Account,
          to_address: l1Account,
          amount,
          symbol
        });
        const {transaction_hash: l2hash} = await initiateWithdraw(l1Account, amount);
        logger.log('Tx hash received', {l2hash});
        handleProgress(
          progressOptions.initiateWithdraw(
            amount,
            symbol,
            stepOf(TransferStep.INITIATE_WITHDRAW, TransferToL1Steps)
          )
        );
        logger.log('Waiting for tx to be received on L2');
        await utils.starknet.waitForTransaction(l2hash, TransactionStatus.RECEIVED);
        logger.log('Done', {l2hash});
        trackSuccess(l2hash);
        handleData({
          type: ActionType.TRANSFER_TO_L1,
          sender: l2Account,
          recipient: l1Account,
          name,
          symbol,
          amount,
          l2hash
        });
      } catch (ex) {
        logger.error(ex.message, ex);
        trackError(ex);
        handleError(progressOptions.error(TransferError.TRANSACTION_ERROR, ex));
      }
    },
    [
      l1Account,
      l2Account,
      handleData,
      handleError,
      handleProgress,
      logger,
      progressOptions,
      selectedToken,
      l2Config,
      initiateWithdraw
    ]
  );
};

export const useCompleteTransferToL1 = () => {
  const logger = useLogger('useCompleteTransferToL1');
  const {account: l1Account, config: l1Config} = useL1Wallet();
  const {handleProgress, handleData, handleError} = useTransfer(CompleteTransferToL1Steps);
  const {addListener, removeListener} = useWithdrawalListener();
  const [trackInitiated, trackSuccess, trackError] = useCompleteTransferToL1Tracking();
  const progressOptions = useTransferProgress();
  const getL1Token = useL1Token();
  const withdraw = useWithdrawTransaction();

  return useCallback(
    async transfer => {
      const {symbol, amount, l2hash} = transfer;

      const onTransactionHash = (error, transactionHash) => {
        if (!error) {
          logger.log('Tx signed', {transactionHash});
          handleProgress(
            progressOptions.withdraw(
              amount,
              symbol,
              stepOf(TransferStep.WITHDRAW, CompleteTransferToL1Steps)
            )
          );
        }
      };

      const onWithdrawal = (error, event) => {
        if (!error) {
          logger.log('Withdrawal event dispatched', event);
          const {transactionHash: l1hash} = event;
          trackSuccess(l1hash);
          handleData({...transfer, l1hash});
        }
      };

      try {
        logger.log('CompleteTransferToL1 called');
        handleProgress(
          progressOptions.waitForConfirm(
            l1Config.name,
            stepOf(TransferStep.CONFIRM_TX, CompleteTransferToL1Steps)
          )
        );
        addListener(onWithdrawal);
        logger.log('Calling withdraw');
        trackInitiated({
          to_address: l1Account,
          l2hash,
          amount,
          symbol
        });
        await withdraw(l1Account, amount, getL1Token(symbol), onTransactionHash);
      } catch (ex) {
        removeListener();
        trackError(ex);
        logger.error(ex?.message, ex);
        handleError(progressOptions.error(TransferError.TRANSACTION_ERROR, ex));
      }
    },
    [
      l1Account,
      l1Config,
      getL1Token,
      handleData,
      handleError,
      handleProgress,
      logger,
      progressOptions,
      addListener,
      removeListener,
      withdraw
    ]
  );
};
