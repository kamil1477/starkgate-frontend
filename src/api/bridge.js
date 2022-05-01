import utils from '../utils';

export const initiateWithdraw = async ({recipient, amount, decimals, contract}) => {
  try {
    return utils.blockchain.starknet.sendTransaction(contract, 'initiate_withdraw', {
      l1Recipient: utils.parser.parseToFelt(recipient),
      amount: utils.parser.parseToUint256(amount, decimals)
    });
  } catch (ex) {
    return Promise.reject(ex);
  }
};
