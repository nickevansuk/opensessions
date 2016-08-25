import React, { PropTypes } from 'react';

import styles from './styles.css';

export default class JSONListField extends React.Component { // eslint-disable-line react/prefer-stateless-function
  static propTypes = {
    components: PropTypes.array,
    value: PropTypes.array,
    onChange: PropTypes.func,
    addText: PropTypes.string
  }
  constructor() {
    super();
    this.state = { empty: {} };
  }
  addEmpty = () => {
    let { value } = this.props;
    const { empty } = this.state;
    if (!value) value = [];
    const newRow = {};
    Object.keys(empty).forEach(key => {
      newRow[key] = empty[key];
    });
    value.push(newRow);
    this.props.onChange(value);
  }
  deleteRow = event => {
    let { target } = event;
    if (!target.dataset) target = target.parentNode;
    const deleteKey = target.dataset.key;
    let { value } = this.props;
    if (!value) value = [];
    value = value.filter((row, key) => key !== deleteKey);
    this.props.onChange(value);
  }
  renderAddButton() {
    return <a onClick={this.addEmpty} className={styles.addButton}>+ {this.props.addText}</a>;
  }
  renderDeleteButton(key) {
    return <a onClick={this.deleteRow} key={key}><img src="/images/garbage.svg" role="presentation" /></a>;
  }
  renderLabels() {
    const { components } = this.props;
    return (<li key="labels">
      <ol className={styles.row}>
        {components.map(field => <li>{field.label}</li>)}
        <li />
      </ol>
    </li>);
  }
  renderRow(key, row, button) {
    const { components } = this.props;
    return (<li key={key}>
      <ol className={styles.row}>
        {components.map(field => {
          const { name } = field.props;
          const attrs = {
            fullSize: true,
            label: '',
            onChange: value => {
              if (key === '-1') {
                let { empty } = this.state;
                if (!empty) empty = {};
                empty[name] = value;
                this.setState({ empty });
              } else {
                const list = this.props.value;
                list[key][name] = value;
                this.props.onChange(list);
              }
            },
            value: row[name]
          };
          return <li><field.Component {...field.props} {...attrs} /></li>;
        })}
        <li>{button}</li>
      </ol>
    </li>);
  }
  render() {
    const { value } = this.props;
    let { empty } = this.state;
    if (!empty) empty = {};
    return (<ol className={styles.list}>
      {this.renderLabels()}
      {value ? null : this.renderRow('-1', empty, this.renderAddButton())}
      {value ? value.map((row, key) => this.renderRow(key, row, key === 0 ? this.renderAddButton() : this.renderDeleteButton(key))) : null}
    </ol>);
  }
}
