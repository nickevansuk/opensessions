import React, { PropTypes } from 'react';
import { Link } from 'react-router';

import Helmet from 'react-helmet';

import Authenticated from '../../components/Authenticated';
import Banner from '../../components/Banner';
import Button from '../../components/Button';
import LoginButton from '../../components/LoginButton';
import NotificationBar from '../../components/NotificationBar';
import SessionList from '../SessionList';
import LoadingMessage from '../../components/LoadingMessage';

import styles from './styles.css';

import { apiFetch } from '../../utils/api';

export default class HomePage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  static contextTypes = {
    user: PropTypes.object,
  }
  constructor() {
    super();
    this.state = {};
  }
  componentDidMount() {
    this.fetchData();
  }
  fetchData = () => apiFetch('/api/stats').then(stats => {
    this.setState({ stats });
  })
  renderSessionList() {
    const { user } = this.context;
    if (!user) return <LoadingMessage message="Loading user" ellipsis />;
    return <SessionList query={{ owner: user.user_id }} heading={<h1>Your Sessions:</h1>} />;
  }
  renderMarketingSections() {
    return (<div className={styles.sections}>
      <section>
        <div className={styles.container}>
          <h1>What is LeisureDesc?</h1>
          <p>LeisureDesc provides you with one place to easily upload and update the descriptions and photos of your activities, and makes them visible to thousands of potential participants across the best sports, fitness and health-focussed websites on the web.</p>
          <LoginButton button redirect="/session/add">Start uploading</LoginButton>
        </div>
      </section>
      <section className={styles.featured}>
        <div className={styles.container}>
          <div className={styles.columns}>
            <div className={styles.column}>
              <h1>Reach new audiences across a network of activity finders</h1>
              <p>A network of websites help thousands of people find ways to be active. LeisureDesc features the rich descriptions and photos of your activities on these websites allowing potential participants to find them.</p>
            </div>
            <div className={styles.column}>
              <h1>Help your audience find your offer</h1>
              <p>You are no longer limited to the basic descriptions in your booking system - LeisureDesc makes it easy to promote the variety of activities you offer in technicolour.</p>
            </div>
          </div>
        </div>
      </section>
      <section>
        <div className={styles.container}>
          <h1>Haven't opened your data yet?</h1>
          <p>If you already use a booking system, club management system, or similar, you need to open the data inside it first. Get in touch with us to find out more.</p>
          <Button to="/partner">Open your data</Button>
        </div>
      </section>
    </div>);
  }
  renderLandingPage() {
    const steps = [
      { text: 'Add more information and photos to the activities that are already in your booking system', img: '/images/landing-step1.png' },
      { text: 'Publish this rich data to complement your booking system\'s existing basic data', img: '/images/landing-step2.png' },
      { text: '100s more people can find your activities and feel informed enough to book', img: '/images/landing-step3.png' }
    ];
    const { stats } = this.state;
    return (<div className={styles.landing}>
      <Banner>
        <h1>Make your activities discoverable</h1>
        <h2>Help more people to find your activities online</h2>
        <br /><br />
        <Authenticated out={<LoginButton redirect="/session/add"><b>+</b> Add an activity</LoginButton>}>
          <p><Link to="/session/add"><b>+</b> Add an activity</Link></p>
        </Authenticated>
      </Banner>
      <div className={styles.steps}>
        <h1>How LeisureDesc works</h1>
        <ol>
          {[steps.map((step, key) => (<li>
            <img src={step.img} role="presentation" />
            <p><span className={styles.num}>{key + 1}.</span> {step.text}</p>
          </li>))]}
        </ol>
        <p><LoginButton button redirect="/session/add">Get started</LoginButton></p>
      </div>
    </div>);
  }
  render() {
    return (<div>
      <Helmet meta={[{ property: 'og:title', content: 'LeisureDesc' }, { property: 'description', content: 'LeisureDesc is your gateway to the most popular physical activity finders on the web.' }]} />
      <NotificationBar zIndex={4} />
      {this.renderLandingPage()}
      <Authenticated>
        <div className={styles.container}>
          {this.renderSessionList()}
        </div>
      </Authenticated>
    </div>);
  }
}
