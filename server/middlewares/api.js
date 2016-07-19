const express = require('express');
const Storage = require('../../storage/interfaces/postgres.js');
const jwt = require('express-jwt');
const dotenv = require('dotenv');

const capitalize = (string) => `${string[0].toUpperCase()}${string.substr(1)}`;

const getSchema = ((model) => JSON.parse(JSON.stringify(model.fieldRawAttributesMap, (key, value) => {
  if (key === 'Model') {
    return;
  }
  return value; // eslint-disable-line consistent-return
})));

dotenv.config({ silent: true });
dotenv.load();

module.exports = (app) => {
  const api = express();
  const rdpe = express();
  const storage = new Storage();
  const database = storage.getInstance();
  const { Session } = database.models;
  const getUser = (req) => (req.user ? req.user.sub : null);

  const requireLogin = jwt({
    secret: new Buffer(process.env.AUTH0_CLIENT_SECRET, 'base64'),
    audience: process.env.AUTH0_CLIENT_ID,
  });

  const resolveModel = (req, res, next) => {
    const modelName = capitalize(req.params.model);
    const Model = database.models[modelName];
    if (!Model) {
      res.json({ error: `Model '${modelName}' does not exist` });
    } else {
      req.Model = Model;
      next();
    }
  };

  const queryParse = (req) => {
    const query = req.query || {};
    if (query) {
      Object.keys(query).forEach((key) => {
        if (key[0] === key[0].toUpperCase()) {
          if (query[key] === 'null') {
            query[key] = null;
          }
        }
      });
    }
    return query;
  };

  rdpe.get('/', (req, res) => {
    res.json({
      sessions: '/api/rdpe/sessions',
    });
  });

  rdpe.get('/sessions', (req, res) => {
    const fromTS = req.query.from || 0;
    let afterID = req.query.after;
    if (afterID) {
      afterID = afterID.substring(1, afterID.length - 1); // to convert `{uuid}` into `uuid`
    }
    const where = {
      $or: [
        {
          updatedAt: fromTS,
          uuid: {
            $gt: afterID
          }
        }, {
          updatedAt: {
            $gt: fromTS,
          },
        }
      ],
      state: {
        $in: ['published', 'deleted', 'unpublished']
      }
    };
    const order = [
      ['updatedAt', 'ASC'],
      ['uuid', 'ASC']
    ];
    const limit = 50;
    Session.findAll({ where, order, limit }).then((rawSessions) => {
      const sessions = rawSessions.map((session) => {
        const state = session.state === 'published' ? 'updated' : 'deleted';
        const item = {
          state,
          kind: 'session',
          id: `{${session.uuid}}`,
          modified: session.updatedAt,
        };
        if (state === 'updated') {
          item.data = session;
        }
        return item;
      });
      let next = {
        from: 0,
        after: 0
      };
      if (sessions.length) {
        const lastSession = sessions[sessions.length - 1];
        next.from = lastSession.modified;
        next.after = lastSession.id;
      } else {
        next = req.query;
      }
      res.json({
        items: sessions,
        next: `/api/rdpe/sessions?from=${next.from}&after=${next.after}`
      });
    }).catch((error) => {
      res.json({ error });
    });
  });

  api.use('/rdpe', rdpe);

  api.get('/:model', resolveModel, (req, res) => {
    const Model = req.Model;
    requireLogin(req, res, () => {
      const query = Model.getQuery({ where: queryParse(req) }, database.models, req.user);
      if (Model.name === 'Session') {
        if ('owner' in query.where) {
          if (query.where.owner !== getUser(req)) {
            res.json({ error: 'Must be logged in to search by owner' });
          }
        } else {
          query.where.state = 'published';
        }
      }
      Model.findAll(query).then((instances) => {
        res.json({ instances });
      }).catch((error) => {
        res.json({ error: error.message });
      });
    });
  });

  api.all('/:model/create', requireLogin, resolveModel, (req, res) => {
    const Model = req.Model;
    const instance = req.body;
    instance.owner = getUser(req);
    Model.create(instance).then((savedInstance) => {
      res.json({ instance: savedInstance });
    }).catch((error) => {
      res.json({ error: error.message });
    });
  });

  api.get('/:model/:uuid', resolveModel, (req, res) => {
    const Model = req.Model;
    const { uuid } = req.params;
    requireLogin(req, res, () => {
      const query = Model.getQuery({ where: { uuid } }, database.models, req.user);
      Model.findOne(query).then((instance) => {
        if (instance) {
          res.json({ instance, schema: getSchema(Model) });
        } else {
          res.json({ error: 'Instance could not be retrieved' });
        }
      }).catch((error) => {
        res.json({ error: error.message });
      });
    });
  });

  api.post('/:model/:uuid', requireLogin, resolveModel, (req, res) => {
    const Model = req.Model;
    Model.findOne({ where: { uuid: req.params.uuid } }).then((instance) => {
      if (instance.owner !== getUser(req)) {
        return res.json({ error: `Must be owner to modify ${Model.name}` });
      }
      Object.keys(req.body).filter((key) => key.slice(-4) === 'Uuid').forEach((key) => {
        if (req.body[key] === null) {
          instance[`set${key.substr(0, key.length - 4)}`](null);
        }
      });
      return instance.update(req.body, { returning: true }).then((savedInstance) => {
        res.json({ instance: savedInstance });
      });
    }).catch((error) => {
      res.json({ error: error.message });
    });
  });

  api.get('/:model/:uuid/:action', requireLogin, resolveModel, (req, res) => {
    const Model = req.Model;
    const { uuid, action } = req.params;
    if (action === 'delete') {
      const query = Model.getQuery({ where: { uuid, owner: getUser(req) } }, database.models, req.user);
      Model.findOne(query)
        .then((instance) => instance.destroy())
        .then(() => res.json({ status: 'success' }))
        .catch((error) => {
          res.json({ status: 'failure', error: error.message });
        });
    }
  });

  api.get('/me/sessions', requireLogin, (req, res) => {
    Session.findAll({ where: { owner: getUser(req) } }).then((sessions) => {
      res.json({ sessions });
    }).catch((error) => {
      res.json({ error });
    });
  });

  app.use('/api', api);
};
