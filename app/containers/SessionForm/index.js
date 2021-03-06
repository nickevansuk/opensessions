import React, { PropTypes } from 'react';

import Fieldset from '../../components/Fieldset';
import Form from '../../components/Form';
import Field from '../../components/Field';
import GenderSVG from '../../components/SVGs/Gender';
import PublishHeader from '../../components/PublishHeader';
import LoadingIcon from '../../components/LoadingIcon';
import LoadingMessage from '../../components/LoadingMessage';

import TextField from '../../components/Fields/Text';
import DateField from '../../components/Fields/Date';
import TimeField from '../../components/Fields/Time';
import BoolRadio from '../../components/Fields/BoolRadio';
import IconRadio from '../../components/Fields/IconRadio';
import Location from '../../components/Fields/Location';
import SearchableSelect from '../../components/Fields/SearchableSelect';
import MultiBool from '../../components/Fields/MultiBool';
import ImageUpload from '../../components/Fields/ImageUpload';
import Relation from '../../components/Fields/Relation';
import Optional from '../../components/Fields/Optional';
import JSONList from '../../components/Fields/JSONList';
import NumberField from '../../components/Fields/Number';
import PricingField from '../../components/Fields/Pricing';

import { Link } from 'react-router';
import Authenticated from '../../components/Authenticated';

import styles from './styles.css';
import publishStyles from '../../components/PublishHeader/styles.css';

import Button from '../../components/Button';

import { apiModel, apiFetch } from '../../utils/api';

import formCopy from './copy.json';

export default class SessionForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  static propTypes = {
    session: PropTypes.object,
    params: PropTypes.object,
    location: PropTypes.object,
    headerText: PropTypes.string
  };
  static contextTypes = {
    user: PropTypes.object,
    router: PropTypes.object,
    notify: PropTypes.func
  }
  constructor(props) {
    super(props);
    const MAX_AGE = 120;
    const GENDER_OPTIONS = [
      { text: 'NONE (MIXED)', value: 'mixed', icon: <GenderSVG /> },
      { text: 'MALE ONLY', value: 'male', icon: <GenderSVG only="male" /> },
      { text: 'FEMALE ONLY', value: 'female', icon: <GenderSVG only="female" /> }
    ];
    const DISABILITIES = ['Learning disability', 'Mental health condition', 'Physical impairment', 'Visual impairment', 'Deaf', 'Please ask for more info'];
    this.state = {
      session: props.session || {},
      isPendingSave: false,
      isSaving: true,
      isLoading: true,
      copy: formCopy,
      fieldsets: [
        { slug: 'description', required: ['title', 'OrganizerUuid', 'description', 'Activities'], fields: ['title', 'OrganizerUuid', 'description', 'Activities'], props: { validity: false } },
        { slug: 'additional', /*required: ['leader'],*/ props: { validity: 'none' }, fields: ['preparation', /*'leader',*/ 'hasCoaching'] },
        { slug: 'location', /*required: ['location'],*/ props: { validity: 'none' }, fields: [/*'location',*/ 'meetingPoint'] },
        //{ slug: 'pricing', props: { validity: 'none' }, fields: ['pricing'] },
        { slug: 'restrictions', props: { validity: 'none' }, fields: ['genderRestriction', 'minAgeRestriction', 'maxAgeRestriction', 'abilityRestriction'] },
        //{ slug: 'contact', props: { validity: 'none' }, fields: ['contactName', 'contactEmail', 'contactPhone'] },
        { slug: 'social', props: { validity: 'none' }, fields: ['socialWebsite', 'socialFacebook', 'socialInstagram', 'socialTwitter', 'socialHashtag'] },
        { slug: 'photo', props: { validity: 'none' }, fields: ['image'] } //,
        //{ slug: 'schedule', required: ['schedule'], props: { validity: false }, fields: ['schedule'] }
      ],
      fields: {
        title: () => <TextField validation={{ maxLength: 50 }} {...this.getAttr('title')} />,
        OrganizerUuid: () => <Relation {...this.getAttr('OrganizerUuid')} props={{ placeholder: 'E.g. Richmond Volleyball' }} relation={{ model: 'organizer', query: { owner: this.context.user ? this.context.user.user_id : null } }} />,
        description: () => <TextField multi size="XL" {...this.getAttr('description')} validation={{ maxLength: 2000 }} />,
        Activities: () => <JSONList
          {...this.getAttrRelation('Activities')}
          onAddEmpty={() => ({})}
          addText="Add category"
          deleteText="Delete category"
          maxLength={3}
          components={[
            { Component: Relation, props: { size: 'small', relation: { model: 'activity' }, name: 'uuid', props: { lazyLoad: true, maxOptions: 5, placeholder: 'E.g. Badminton' } } }
          ]}
        />,
        ActivityUuid: () => <Relation {...this.getAttr('ActivityUuid')} relation={{ model: 'activity', query: { } }} props={{ lazyLoad: true, maxOptions: 5 }} />,
        preparation: () => <TextField multi validation={{ maxLength: 500 }} {...this.getAttr('preparation')} />,
        // leader: () => <TextField {...this.getAttr('leader')} />,
        leader: () => <SearchableSelect {...this.getAttr('leader')} onChange={value => this.updateSession('leader', value || '')} options={this.getNames()} addItem={this.addName('leader')} lazyLoad />,
        hasCoaching: () => <BoolRadio {...this.getAttr('hasCoaching')} options={[{ text: 'No, the session is unlead' }, { text: 'Yes, the session is coached' }]} />,
        location: () => <Location {...this.getAttr('location')} dataValue={this.state.session.locationData} onDataChange={value => this.updateSession('locationData', value)} />,
        meetingPoint: () => <TextField multi validation={{ maxLength: 500 }} {...this.getAttr('meetingPoint')} />,
        pricing: () => <PricingField {...this.getAttr('pricing')} />,
        quantity: () => <NumberField {...this.getAttr('quantity')} validation={{ min: 0 }} />,
        genderRestriction: () => <IconRadio options={GENDER_OPTIONS} {...this.getAttr('genderRestriction')} />,
        minAgeRestriction: () => <Optional {...this.getAttr('minAgeRestriction')} component={{ type: NumberField, props: { validation: { min: 0, max: this.state.session.maxAgeRestriction || MAX_AGE }, format: ': years old' } }} null="0" />,
        maxAgeRestriction: () => <Optional {...this.getAttr('maxAgeRestriction')} component={{ type: NumberField, props: { validation: { min: this.state.session.minAgeRestriction || 0, max: MAX_AGE }, format: ': years old' } }} null="0" />,
        abilityRestriction: () => <MultiBool options={DISABILITIES} {...this.getAttr('abilityRestriction')} />,
        contactName: () => <SearchableSelect {...this.getAttr('contactName')} onChange={value => this.updateSession('contactName', value || '')} options={this.getNames()} addItem={this.addName('contactName')} lazyLoad />,
        contactEmail: () => <SearchableSelect {...this.getAttr('contactEmail')} onChange={value => this.updateSession('contactEmail', value || '')} options={this.getEmails()} addItem={this.addEmail} lazyLoad />,
        contactPhone: () => <TextField {...this.getAttr('contactPhone')} />,
        socialWebsite: () => <TextField placeholder="https://" {...this.getAttr('socialWebsite')} />,
        socialFacebook: () => <TextField placeholder="https://" {...this.getAttr('socialFacebook')} />,
        socialInstagram: () => <TextField placeholder="@instagoodgym" {...this.getAttr('socialInstagram')} />,
        socialTwitter: () => <TextField placeholder="@goodgym" {...this.getAttr('socialTwitter')} />,
        socialHashtag: () => <TextField placeholder="#UseYourRun" {...this.getAttr('socialHashtag')} />,
        image: () => <ImageUpload preview {...this.getAttr('image')} upload={{ URL: `/api/session/${this.state.session.uuid}/image`, name: 'image' }} />,
        schedule: () => <JSONList
          {...this.getAttrRelation('schedule')}
          addText="Add another date"
          onAddEmpty={newRow => {
            if (newRow.startDate) {
              const date = new Date(newRow.startDate);
              date.setDate(date.getDate() + 7);
              newRow.startDate = date.toISOString().substr(0, 10);
            }
            return newRow;
          }}
          maxLength={10}
          maxText="LeisureDesc is still in 'beta' mode. You have reached the maximum number of sessions that can be scheduled"
          components={[
            { label: 'Date', Component: DateField, props: { name: 'startDate' } },
            { label: 'Start time', Component: TimeField, props: { name: 'startTime' } },
            { label: 'End time', Component: TimeField, props: { name: 'endTime' } }
          ]}
        />
      }
    };
  }
  componentDidMount() {
    this.fetchData();
  }
  onChange = session => {
    const { fieldsets } = this.state;
    const invalidValues = [undefined, 'null', '""', '[]'];
    fieldsets.filter(fieldset => fieldset.required).forEach(fieldset => {
      let validity = true;
      fieldset.required.map(field => JSON.stringify(session[field])).forEach(val => {
        if (invalidValues.indexOf(val) >= 0) validity = false;
      });
      fieldset.props.validity = validity;
    });
    const pendingSteps = fieldsets.filter(fieldset => !fieldset.props.validity).length;
    this.setState({ fieldsets, pendingSteps });
  }
  setActivities(activities) {
    const { Activities } = this.state.session;
    let uuids = activities.map(activity => activity.uuid).filter((uuid, key) => uuid !== null || ((key + 1) === activities.length && key));
    uuids = uuids.filter((uuid, key) => uuids.indexOf(uuid) === key);
    if (uuids.length && uuids.every((uuid, key) => uuid === Activities[key])) return;
    uuids = uuids.filter(uuid => uuid !== null);
    apiModel.action('session', this.state.session.uuid, 'setActivitiesAction', { uuids }).then(() => {
      const { session } = this.state;
      session.Activities = uuids.map(uuid => ({ uuid }));
      this.setState({ session });
    });
  }
  getAttr = name => {
    const { session } = this.state;
    return {
      value: session[name],
      onChange: value => this.updateSession(name, value)
    };
  }
  getAttrRelation = name => {
    const { session } = this.state;
    return {
      value: session[name] && session[name].length ? session[name] : ([{}]),
      onChange: value => this.updateSession(name, value)
    };
  }
  getActions = () => {
    const { session, isSaving, isPendingSave } = this.state;
    const { params } = this.props;
    const isPublished = session.state === 'published';
    const actions = [];
    if (isSaving) actions.push(<LoadingIcon />);
    if (session.state) {
      let text = isPublished ? 'View' : 'Preview';
      if (isPendingSave) text = 'Saving...';
      const viewURL = `/session/${session.uuid}${params.tab ? `?tab=${params.tab}` : ''}`;
      actions.push(<Link key="view" to={viewURL} className={[publishStyles.previewButton, isPendingSave ? publishStyles.disabled : null].join(' ')}>{text}</Link>);
      const publishStyle = isPublished ? 'draft' : 'live';
      actions.push(<Button onClick={isPublished ? this.unpublishSession : this.publishSession} style={isPendingSave ? 'disabled' : publishStyle}>{isPublished ? 'Unpublish' : 'Publish'}</Button>);
    }
    return actions;
  }
  getNames() {
    const { session, customNames, personList } = this.state;
    const { user } = this.context;
    let options = [];
    if (session) {
      const { contactName, leader } = session;
      if (leader) options.push(leader);
      if (contactName) options.push(contactName);
    }
    if (personList) options = options.concat(personList);
    if (user && user.nickname.match(/^[A-Z]/)) options.push(user.nickname);
    if (customNames) options = options.concat(customNames);
    return options.filter((name, key) => options.indexOf(name) === key).map(name => ({ uuid: name, name }));
  }
  getEmails() {
    const { session, customEmails } = this.state;
    const user = this.context.user || {};
    let emailOptions = user ? [user.email] : [];
    if (customEmails) emailOptions = emailOptions.concat(customEmails);
    if (session) {
      const { contactEmail } = session;
      if (contactEmail && contactEmail !== user.email) {
        emailOptions.push(contactEmail);
      }
    }
    return emailOptions.map(option => ({ uuid: option, name: option }));
  }
  fetchData = () => {
    const { session, params, location } = this.props;
    const uuid = session ? session.uuid : (params.uuid || null);
    return uuid
      ? apiModel.get('session', uuid).then(res => {
        this.onChange(res.instance);
        this.setState({ session: res.instance, isSaving: false, isLoading: false });
        apiFetch('/api/leader-list').then(result => {
          this.setState({ personList: result.list });
        });
      })
      : apiModel.new('session', location.query).then(res => {
        if (!(location.hash && location.hash === '#welcome')) this.notify('You have created a new activity', 'success');
        this.context.router.replace(`${res.instance.href}/edit`);
      });
  }
  updateSession = (name, value) => {
    const { session } = this.state;
    session[name] = value;
    if (name === 'Activities') this.setActivities(value);
    else {
      this.onChange(session);
      this.setState({ status: '', session });
      this.autosave(2000);
    }
  }
  errorClick = event => {
    const { target } = event;
    const { tab, field } = target.dataset;
    const { session } = this.state;
    if (!tab) return;
    this.context.router.push(`${session.href}/edit/${tab}#${field}`);
  }
  notify(...args) {
    if (this.notification) this.notification.redact();
    this.notification = this.context.notify.apply(this.context.notify, args);
    return this.notification;
  }
  changeSessionState = state => {
    const { session } = this.state;
    const oldState = session.state;
    session.state = state;
    return new Promise((resolve, reject) => {
      apiModel.edit('session', session.uuid, session).then(res => {
        this.setState({ session: res.instance });
        resolve(res);
      }).catch(res => {
        session.state = oldState;
        this.notify(<p onClick={this.errorClick} dangerouslySetInnerHTML={{ __html: res.error }} />, 'error');
        reject(res.error);
      });
    });
  }
  publishSession = () => this.changeSessionState('published').then(() => this.notify('Your activity has been published!', 'success')).then(() => this.context.router.push(this.state.session.href))
  unpublishSession = () => this.changeSessionState('unpublished').then(() => this.notify('Your activity has been unpublished!', 'warn'))
  addName = key => name => {
    // const names = [name].concat(this.state.customNames || []);
    // this.setState({ customNames: names.filter((n, k) => names.indexOf(n) === k) });
    this.updateSession(key, name);
    return Promise.resolve();
  }
  addEmail = email => {
    this.setState({ customEmails: [email] });
    this.updateSession('contactEmail', email);
  }
  autosave = (ms) => {
    if (this.timeout) clearTimeout(this.timeout);
    this.setState({ isPendingSave: true, status: 'Saving...', saveState: 'saving' });
    this.timeout = setTimeout(() => {
      this.setState({ isSaving: true, isPendingSave: false, status: 'Saving...', saveState: 'saving' });
      const { session } = this.state;
      if (session.state !== 'unpublished') {
        session.state = 'draft';
      }
      apiModel.edit('session', session.uuid, session).then(result => {
        const { instance, error } = result;
        if (this.state.isPendingSave) return true;
        if (error) throw new Error(error);
        this.setState({ isPendingSave: false, isSaving: false, session: instance, status: 'Saved draft!', saveState: 'saved' });
        return result;
      }).catch(result => {
        this.setState({ status: 'Failed saving', isPendingSave: false, isSaving: false, saveState: 'error' });
        console.error(result.error);
        this.notify('Autosave failed', 'error');
      });
    }, ms);
  }
  renderForm = () => <Form fieldsets={this.state.fieldsets} onPublish={this.publishSession} pendingSteps={this.state.pendingSteps} status={this.state.status} saveState={this.state.saveState} tab={this.props.params.tab} activeField={this.props.location.hash.slice(1)}>{this.renderFieldsets()}</Form>
  renderFieldsets = () => this.state.fieldsets.map((fieldset, key) => <Fieldset key={key} {...fieldset.props} {...this.state.copy.fieldsets[fieldset.slug]}>{this.renderFieldset(fieldset)}</Fieldset>)
  renderFieldset = fieldset => <div>{fieldset.fields.map(this.renderField)}</div>
  renderField = field => <Field key={field} {...this.state.copy.fields[field]}>{this.state.fields[field] ? this.state.fields[field]() : <TextField {...this.getAttr(field)} />}</Field>
  render() {
    const { session } = this.state;
    const { headerText } = this.props;
    return (<div className={styles.form}>
      <Authenticated message="You must login before you can add an activity">
        {headerText ? <PublishHeader h2={headerText} h3={session.title || <i>Untitled</i>} actions={this.getActions()} /> : null}
        <div className={styles.formBody}>
          {this.state.isLoading ? <LoadingMessage message="Loading" ellipsis /> : this.renderForm()}
        </div>
      </Authenticated>
    </div>);
  }
}
