import {useCallback} from 'react';

import {ActionType, stepOf, TransferError, TransferStep, TransferToL2Steps} from '../enums';
import {starknet} from '../libs';
import {useDepositListener} from '../providers/EventManagerProvider';
import {useSelectedToken} from '../providers/TransferProvider';
import {useL1Wallet, useL2Wallet} from '../providers/WalletsProvider';
import utils from '../utils';
import {useAllowanceCall, useIsMaxTotalBalanceExceeded} from './useContractCall';
import {useLogger} from './useLogger';
import {useTransferToL2Tracking} from './useTracking';
import {useApproveTransaction, useDepositTransaction} from './useTransaction';
import {useTransfer} from './useTransfer';
import {useTransferProgress} from './useTransferProgress';

export const useTransferToL2 = () => {
  const logger = useLogger('useTransferToL2');
  const [trackInitiated, trackSuccess, trackError, trackReject] = useTransferToL2Tracking();
  const {account: l1Account, chainId: l1ChainId, config: l1Config} = useL1Wallet();
  const {account: l2Account} = useL2Wallet();
  const {handleProgress, handleData, handleError} = useTransfer(TransferToL2Steps);
  const {addListener, removeListener} = useDepositListener();
  const selectedToken = useSelectedToken();
  const progressOptions = useTransferProgress();
  const isMaxBalanceExceeded = useIsMaxTotalBalanceExceeded();
  const allowance = useAllowanceCall();
  const approve = useApproveTransaction();
  const deposit = useDepositTransaction();

  return useCallback(
    async amount => {
      const {symbol, name, bridgeAddress} = selectedToken;
      const isEthToken = utils.token.isEth(symbol);
      const tokenBridgeAddress = bridgeAddress[l1ChainId];

      const onTransactionHash = (error, transactionHash) => {
        if (!error) {
          logger.log('Tx signed', {transactionHash});
          handleProgress(
            progressOptions.deposit(amount, symbol, stepOf(TransferStep.DEPOSIT, TransferToL2Steps))
          );
        }
      };

      const onDeposit = async (error, event) => {
        if (!error) {
          logger.log('Deposit event dispatched', event);
          trackSuccess(event.transactionHash);
          handleData({
            type: ActionType.TRANSFER_TO_L2,
            sender: l1Account,
            recipient: l2Account,
            l1hash: event.transactionHash,
            name,
            symbol,
            amount,
            event
          });
        }
      };

      try {
        logger.log('TransferToL2 called');
        if (await isMaxBalanceExceeded()) {
          trackReject(progressOptions.error(TransferError.MAX_TOTAL_BALANCE_ERROR));
          logger.error(`Prevented ${symbol} deposit due to max balance exceeded`);
          handleError(progressOptions.error(TransferError.MAX_TOTAL_BALANCE_ERROR));
          return;
        }
        if (!isEthToken) {
          logger.log('Token needs approval');
          handleProgress(
            progressOptions.approval(symbol, stepOf(TransferStep.APPROVE, TransferToL2Steps))
          );
          const allow = await allowance(l1Account, tokenBridgeAddress);
          logger.log('Current allow value', {allow});
          logger.log('Current allow value', {allow});
          if (allow < amount) {
            logger.log('Allow value is smaller then amount, sending approve tx...', {amount});
            await approve(tokenBridgeAddress, starknet.constants.MASK_250);
          }
        }
        handleProgress(
          progressOptions.waitForConfirm(
            l1Config.name,
            stepOf(TransferStep.CONFIRM_TX, TransferToL2Steps)
          )
        );
        addListener(onDeposit);
        logger.log('Calling deposit');
        trackInitiated({
          from_address: l1Account,
          to_address: l2Account,
          amount,
          symbol
        });
        await deposit(l2Account, amount, onTransactionHash);
      } catch (ex) {
        removeListener();
        trackError(ex);
        logger.error(ex?.message, ex);
        handleError(progressOptions.error(TransferError.TRANSACTION_ERROR, ex));
      }
    },
    [
      selectedToken,
      addListener,
      removeListener,
      l1ChainId,
      l1Account,
      l2Account,
      l1Config,
      handleData,
      handleError,
      handleProgress,
      logger,
      progressOptions,
      isMaxBalanceExceeded,
      allowance,
      approve,
      deposit
    ]
  );
};
