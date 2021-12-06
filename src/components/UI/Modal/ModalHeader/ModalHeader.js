import PropTypes from 'prop-types';
import React from 'react';

import {toClasses} from '../../../../utils';
import {ModalType} from '../Modal/Modal.constants';
import styles from './ModalHeader.module.scss';

export const ModalHeader = ({type = ModalType.INFO, children}) => (
  <div className={toClasses(styles.modalHeader, styles[type])}>{children}</div>
);

ModalHeader.propTypes = {
  type: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
};