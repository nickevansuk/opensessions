import React, { PropTypes } from 'react';

import styles from './styles.css';

export default class Button extends React.Component { // eslint-disable-line react/prefer-stateless-function
  static propTypes = {
    children: PropTypes.node,
    onClick: PropTypes.func
  };
  render() {
    return (<a onClick={this.props.onClick} className={styles.button}>
      {this.props.children}
    </a>);
  }
}
