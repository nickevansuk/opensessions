import React, { PropTypes } from 'react';
import { Link } from 'react-router';

import LoadingMessage from '../../components/LoadingMessage';

import { apiModel } from '../../utils/api';

import styles from './styles.css';

export default class ListOrganizers extends React.Component { // eslint-disable-line react/prefer-stateless-function
  static contextTypes = {
    notify: PropTypes.func,
    store: PropTypes.object
  };
  static propTypes = {
    params: PropTypes.object
  };
  static fetchData(dispatch) {
    return apiModel.search('organizer').then(result => {
      const { instances, error } = result;
      if (error) throw error;
      dispatch({ type: 'ORGANIZER_LIST_LOADED', payload: instances.sort((i1, i2) => (i1.createdAt > i2.createdAt ? 1 : -1)) });
    });
  }
  constructor() {
    super();
    this.state = { isLoading: false };
  }
  componentDidMount() {
    this.setState({ isLoading: true }); // eslint-disable-line react/no-did-mount-set-state
    this.constructor.fetchData(this.context.store.dispatch).then(() => {
      this.setState({ isLoading: false });
    }).catch(error => {
      this.context.notify(error, 'error');
    });
  }
  renderPagination(page, start, end, maxPage) {
    return (<div className={styles.pagination}>
      {page > 1 ? <Link className={styles.page} to={`/organizers/${page - 1}`}>Previous page</Link> : null}
      <span> Page {page} of {maxPage} </span>
      {page < maxPage ? <Link className={styles.page} to={`/organizers/${page + 1}`}>Next page</Link> : null}
    </div>);
  }
  render() {
    const { params } = this.props;
    const isLoading = this.state ? this.state.isLoading : false;
    const organizers = this.context.store.getState().get('organizerList') || [];
    const limit = 256;
    const total = organizers ? organizers.length : 0;
    const page = (params && params.page) ? parseInt(params.page, 10) : 1;
    const maxPage = Math.ceil(total / limit);
    const [start, end] = [-1, 0].map(index => page + index).map(index => index * limit);
    return (<div className={styles.list}>
      {this.renderPagination(page, start, end, maxPage)}
      {isLoading
        ? <LoadingMessage message="Loading organisers" ellipsis />
        : (<ol>
          {organizers.slice(start, end).map(organizer => (<li>
            <span>
              {organizer.image ? <img src={organizer.image} role="presentation" className={styles.icon} /> : null}
              <Link to={organizer.href}>{organizer.name}</Link>
              {organizer.Sessions.length ? <span className={styles.nSessions}>{organizer.Sessions.length} sessions</span> : null}
            </span>
            <span className={styles.createdAt}>created {(new Date(organizer.createdAt)).toDateString()}</span>
          </li>))}
        </ol>)
      }
      {this.renderPagination(page, start, end, maxPage)}
    </div>);
  }
}
