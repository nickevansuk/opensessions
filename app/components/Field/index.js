import React from 'react';

import BoolRadioField from 'components/BoolRadioField';
import IconRadioField from 'components/IconRadioField';
import RelationField from 'components/RelationField';
import OptionalNumField from 'components/OptionalNumField';
import LocationField from 'components/LocationField';

import styles from './styles.css';

import { apiFetch } from '../../utils/api';

export default class Field extends React.Component { // eslint-disable-line react/prefer-stateless-function
  static propTypes = {
    label: React.PropTypes.string.isRequired,
    model: React.PropTypes.object,
    name: React.PropTypes.string.isRequired,
    relationURL: React.PropTypes.string,
    relationQuery: React.PropTypes.object,
    id: React.PropTypes.string,
    onChange: React.PropTypes.func,
    tip: React.PropTypes.string,
    type: React.PropTypes.string,
    validation: React.PropTypes.object,
    value: React.PropTypes.string,
    options: React.PropTypes.array
  }
  constructor(props) {
    super(props);
    this.state = {
      value: props.value || '',
      valid: undefined,
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleValueChange = this.handleValueChange.bind(this);
    if (props.type === 'relation') {
      this.fetchRelation(this.props.relationQuery);
    }
  }
  componentWillReceiveProps(nextProps) {
    this.setState({
      value: nextProps.value || ''
    });
  }
  fetchRelation(query, value) {
    const self = this;
    return apiFetch(this.props.relationURL, { query }).then((options) => {
      if (typeof value === 'undefined' && options[0]) value = options[0].uuid;
      this.props.model.update(this.props.name, value);
      self.setState({ options, value });
    });
  }
  handleValueChange(value) {
    const newState = { value };
    if (this.props.validation) {
      newState.valid = this.isValid(value);
    }
    this.setState(newState);
    if (this.props.onChange) {
      this.props.onChange(value);
    }
    if (this.props.model) {
      this.props.model.update(this.props.name, value);
    }
  }
  handleChange(event) {
    const value = event.target.value;
    this.handleValueChange(value);
  }
  isValid(value) {
    if (typeof value === 'undefined') value = this.state.value;
    const opts = this.props.validation || '';
    let valid = true;
    if (opts.maxLength) {
      if (value.length > opts.maxLength) {
        valid = false;
      }
    } else if (value.length === 0) {
      valid = false;
    }
    this.setState({ valid });
    return valid;
  }
  renderValidationMaxLength() {
    const maxLength = this.props.validation.maxLength;
    const text = this.state.value || this.props.model[this.props.name] || '';
    let num = maxLength - text.length;
    let urgency = styles.valid;
    let characterState = 'remaining';
    if (num / maxLength < .1) {
      urgency = styles.danger;
    } else if (num / maxLength < .2) {
      urgency = styles.warn;
    }
    if (num < 0) {
      num = 0 - num;
      characterState = 'too many';
    }
    const characters = num === 1 ? 'character' : 'characters';
    return <div className={styles.maxLength}><span className={urgency}>{num}</span> {characters} {characterState}</div>;
  }
  renderValidation() {
    const opts = this.props.validation;
    if (!opts) return false;
    if (opts.maxLength) {
      return this.renderValidationMaxLength();
    }
    return false;
  }
  render() {
    let label = this.props.label;
    const validClass = this.state.valid === false ? styles.invalid : '';
    const attrs = {
      onChange: this.handleChange,
      className: `${styles.input} ${validClass}`,
      name: this.props.name,
      value: this.state.value,
    };
    if (this.props.model) {
      attrs.value = this.props.model.hasOwnProperty(attrs.name) ? this.props.model[attrs.name] : '';
    }
    let input;
    const type = this.props.type || 'text';
    if (type === 'textarea') {
      if (this.props.validation && this.props.validation.maxLength > 100) {
        attrs.className = `${attrs.className} ${styles.longText}`;
      }
      input = <textarea {...attrs} />;
    } else if (type === 'relation') {
      const options = this.state.options || [];
      const onClick = (event) => {
        event.preventDefault();
        this.setState({ relationState: 'typeNew' });
      };
      const inputEvents = (event) => {
        if ((event.type === 'blur' && !event.target.value) || (event.type === 'keypress' && !event.target.value && event.charCode === 8)) {
          this.setState({ relationState: 'none' });
          return;
        } else if (event.type === 'keypress' && event.charCode !== 13) {
          return;
        }
        event.preventDefault();
        apiFetch(`${this.props.relationURL}/create`, { body: { name: event.target.value } }).then((relation) => {
          this.setState({ relationState: 'none' });
          this.fetchRelation(this.props.relationQuery, relation.uuid);
        });
      };
      let addControl = (<button onClick={onClick} className={styles.addRelation}>Add +</button>);
      if (this.state.relationState === 'typeNew') {
        addControl = (<input onKeyPress={inputEvents} onBlur={inputEvents} className={styles.input} type="text" autoFocus />);
      }
      let selectBox = null;
      if (options.length) {
        selectBox = (<select {...attrs} defaultValue={this.state.value}>
          <option value="">None</option>
          {options.map((option) => <option value={option.uuid}>{option.name}</option>)}
        </select>);
      }
      input = (<div className={styles.relationWrap}>
        {selectBox}
        {addControl}
      </div>);
    } else {
      if (type === 'date') {
        const date = new Date(attrs.value);
        attrs.value = date.toLocaleDateString()
          .split('/')
          .reverse()
          .join('-');
      }
      if (type === 'IconRadio') {
        input = <IconRadioField name={attrs.name} options={this.props.options} onChange={this.handleChange} value={attrs.value} />;
      } else if (type === 'BoolRadio') {
        input = <BoolRadioField name={attrs.name} options={this.props.options} onChange={this.handleChange} trueText={this.props.options[1].text} falseText={this.props.options[0].text} value={attrs.value} />;
      } else if (type === 'Relation') {
        input = <RelationField name={attrs.name} onChange={this.handleChange} value={attrs.value} />;
      } else if (type === 'OptionalNum') {
        input = <OptionalNumField name={attrs.name} onChange={this.handleValueChange} value={attrs.value} />;
      } else if (type === 'Location') {
        input = <LocationField {...this.props} name={attrs.name} value={attrs.value} inputStyle={styles.input} />;
      } else {
        attrs.type = type;
        input = <input {...attrs} />;
      }
    }
    let tip;
    if (this.props.tip) {
      tip = (<div className={styles.tip}>
        <strong>{label}</strong>
        <p>{this.props.tip}</p>
      </div>);
    }
    return (
      <div className={styles.field} data-valid={this.state.valid}>
        <label className={styles.label}>{label}</label>
        <div className={styles.inputWrap}>
          {input}
          {tip}
          {this.renderValidation()}
        </div>
      </div>
    );
  }
}
