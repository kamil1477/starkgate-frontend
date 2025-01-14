import {useCallback, useContext} from 'react';

import {ModalType} from '../../enums';
import {useOnboardingModalTranslation, useTransactionSubmittedModalTranslation} from '../../hooks';
import {ModalContext} from './modal-context';

export const useModal = () => {
  return {
    ...useContext(ModalContext)
  };
};

export const useHideModal = () => {
  const {hideModal} = useContext(ModalContext);

  return useCallback(() => {
    hideModal();
  }, [hideModal]);
};

export const useProgressModal = (steps = []) => {
  const {showModal} = useContext(ModalContext);

  return useCallback(
    (title, message, activeStep = 0, type = ModalType.INFO) => {
      showModal({
        headerComponentPath: steps.length > 0 ? 'UI/Stepper/Stepper' : null,
        headerComponentProps:
          steps.length > 0
            ? {
                steps,
                activeStep
              }
            : null,
        componentPath: 'UI/Modal/ProgressModal/ProgressModal',
        componentProps: {
          message
        },
        title,
        type
      });
    },
    [showModal]
  );
};

export const useTransactionSubmittedModal = steps => {
  const {showModal} = useContext(ModalContext);
  const {titleTxt} = useTransactionSubmittedModalTranslation();

  return useCallback(
    transfer => {
      showModal({
        headerComponentPath: 'UI/Stepper/Stepper',
        headerComponentProps: {
          steps,
          activeStep: steps.length
        },
        componentPath: 'UI/Modal/TransactionSubmittedModal/TransactionSubmittedModal',
        componentProps: {
          transfer
        },
        title: titleTxt,
        withButtons: true
      });
    },
    [showModal]
  );
};

export const useErrorModal = () => {
  const {showModal} = useContext(ModalContext);

  return useCallback(
    (title, body) => {
      showModal({
        title,
        body,
        withButtons: true,
        type: ModalType.ERROR
      });
    },
    [showModal]
  );
};

export const useOnboardingModal = () => {
  const {showModal} = useContext(ModalContext);
  const {titleTxt} = useOnboardingModalTranslation();

  return useCallback(() => {
    showModal({
      componentPath: 'UI/Modal/OnboardingModal/OnboardingModal',
      title: titleTxt,
      withButtons: true
    });
  }, [showModal]);
};
