const express = require('express');
const jwt = require('express-jwt');
const dotenv = require('dotenv');
const fs = require('fs');

const Storage = require('../../storage/interfaces/postgres.js');
const RDPE = require('./rdpe.js');
const s3 = require('./s3.js');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const capitalize = string => `${string[0].toUpperCase()}${string.substr(1)}`;

dotenv.config({ silent: true });
dotenv.load();

module.exports = () => {
  const api = express();
  const storage = new Storage();
  const database = storage.getInstance();
  const getUser = req => (req.user ? req.user.sub : null);

  api.use('/rdpe', RDPE(database, { URL: process.env.SERVICE_LOCATION }));
  api.use('/rdpe-legacy', RDPE(database, { URL: process.env.SERVICE_LOCATION, preserveLatLng: true, baseURL: '/api/rdpe-legacy' }));

  const requireLogin = jwt({
    secret: new Buffer(process.env.AUTH0_CLIENT_SECRET, 'base64'),
    audience: process.env.AUTH0_CLIENT_ID,
  });

  const resolveModel = (req, res, next) => {
    const modelName = capitalize(req.params.model);
    if (modelName in database.models) {
      req.Model = database.models[modelName];
      next();
    } else {
      res.status(404).json({ error: `Model '${modelName}' does not exist` });
    }
  };

  const queryParse = req => {
    const query = req.query || {};
    if (query) {
      Object.keys(query).filter(key => key[0] === key[0].toUpperCase() && query[key] === 'null').forEach(key => {
        query[key] = null;
      });
    }
    return query;
  };

  const instanceToJSON = (instance, user) => {
    const json = Object.assign(instance.get(), {
      actions: instance.getActions ? instance.getActions(database.models, user) : null
    });
    ['Sessions'].filter(type => json[type]).forEach(type => {
      json[type] = json[type].map(child => instanceToJSON(child, user));
    });
    return json;
  };

  api.get('/config.js', (req, res) => {
    const windowKeys = ['GOOGLE_MAPS_API_KEY', 'INTERCOM_APPID', 'AWS_S3_IMAGES_BASEURL', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_DOMAIN', 'LOCALE_COUNTRY'];
    res.send(`
      ${windowKeys.map(key => `window["${key}"] = '${process.env[key]}'`).join(';\n')};

      !function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","page","once","off","on"];analytics.factory=function(t){return function(){var e=Array.prototype.slice.call(arguments);e.unshift(t);analytics.push(e);return analytics}};for(var t=0;t<analytics.methods.length;t++){var e=analytics.methods[t];analytics[e]=analytics.factory(e)}analytics.load=function(t){var e=document.createElement("script");e.type="text/javascript";e.async=!0;e.src=("https:"===document.location.protocol?"https://":"http://")+"cdn.segment.com/analytics.js/v1/"+t+"/analytics.min.js";var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(e,n)};analytics.SNIPPET_VERSION="3.1.0";
        analytics.load("${process.env.SEGMENT_WRITE_KEY}");
      }}();

      function addScript(src) {
        var script = document.createElement('script');
        script.src = src;
        document.head.appendChild(script);
      }
      addScript("https://maps.googleapis.com/maps/api/js?key=" + window.GOOGLE_MAPS_API_KEY + "&libraries=places");
    `);
  });

  api.get('/:model', resolveModel, (req, res) => {
    const { Model } = req;
    requireLogin(req, res, () => {
      const query = Model.getQuery({ where: queryParse(req) }, database.models, getUser(req));
      if (query instanceof Error) {
        res.status(400).json({ status: 'failure', error: query.message });
        return;
      }
      Model.findAll(query).then(instances => {
        res.json({ instances: instances.map(instance => instanceToJSON(instance, getUser(req))) });
      }).catch(error => {
        res.status(404).json({ error: error.message });
      });
    });
  });

  api.all('/:model/create', requireLogin, resolveModel, (req, res) => {
    const { Model } = req;
    const getPrototype = Model.getPrototype || (() => Promise.resolve({}));
    getPrototype(database.models, getUser(req)).then(data => {
      Object.keys(req.body).forEach(key => {
        data[key] = req.body[key];
      });
      data.owner = getUser(req);
      Model.create(data).then(instance => {
        res.json({ instance: instanceToJSON(instance, getUser(req)) });
      }).catch(error => {
        res.status(404).json({ error: error.message });
      });
    });
  });

  api.get('/:model/:uuid', resolveModel, (req, res) => {
    const { Model } = req;
    const { uuid } = req.params;
    requireLogin(req, res, () => {
      const query = Model.getQuery({ where: { uuid } }, database.models, getUser(req));
      if (query instanceof Error) {
        res.status(400).json({ status: 'failure', error: query.message });
      } else {
        Model.findOne(query).then(instance => {
          if (!instance) throw new Error('Instance could not be retrieved');
          res.json({ instance: instanceToJSON(instance, getUser(req)) });
        }).catch(error => {
          res.status(404).json({ error: error.message, isLoggedIn: !!req.user });
        });
      }
    });
  });

  api.post('/:model/:uuid', requireLogin, resolveModel, (req, res) => {
    const { Model } = req;
    const { uuid } = req.params;
    const query = Model.getQuery({ where: { uuid } }, database.models, getUser(req));
    if (query instanceof Error) {
      res.status(400).json({ status: 'failure', error: query.message });
    } else {
      Model.findOne(query).then(instance => {
        if (instance.owner !== getUser(req)) throw new Error(`Must be owner to modify ${Model.name}`);
        const fields = Object.keys(req.body);
        fields.filter(key => key.slice(-4) === 'Uuid').filter(key => req.body[key] === null).forEach(key => {
          instance[`set${key.replace(/Uuid$/, '')}`](null);
        });
        if (query.include) {
          query.include.forEach(model => {
            delete req.body[model.name];
          });
        }
        return instance.update(req.body, { returning: true }).then(savedInstance => {
          res.json({ instance: instanceToJSON(savedInstance, getUser(req)) });
        });
      }).catch(error => {
        res.status(404).json({ error: error.message });
      });
    }
  });

  api.all('/:model/:uuid/action/:action', resolveModel, (req, res) => {
    const { Model } = req;
    const { uuid, action } = req.params;
    requireLogin(req, res, () => {
      const user = getUser(req);
      const query = Model.getQuery({ where: { uuid } }, database.models, user);
      if (query instanceof Error) {
        res.status(400).json({ status: 'failure', error: query.message });
      } else {
        Model.findOne(query).then(instance => {
          const actions = instance.getActions(database.models, user);
          if (actions.indexOf(action) !== -1) {
            instance[action](req)
              .then(result => res.json(Object.assign({ status: 'success' }, result)))
              .catch(error => res.status(404).json({ status: 'failure', error }));
          } else {
            res.status(500).json({ status: 'failure', error: `'${action}' is an unavailable action` });
          }
        }).catch(() => res.status(404).json({ status: 'failure', error: 'Record not found', query: query.where }));
      }
    });
  });

  api.post('/:model/:uuid/:field', requireLogin, resolveModel, upload.single('image'), (req, res, next) => {
    const { Model } = req;
    const image = req.file;
    if (image) {
      const { model, uuid, field } = req.params;
      const aws = {
        URL: process.env.AWS_S3_IMAGES_BASEURL,
        path: `uploads/${model}/${field}/`,
        accessKeyId: process.env.AWS_S3_IMAGES_ACCESSKEY,
        secretAccessKey: process.env.AWS_S3_IMAGES_SECRETKEY
      };
      s3(aws, image.path, uuid)
        .then(result => Model.findOne({ where: { uuid, owner: getUser(req) } })
          .then(instance => {
            const data = {};
            data[field] = `https://${aws.URL}/${result.versions[model === 'organizer' ? 0 : 1].key}`;
            [image].concat(result.versions).forEach(version => fs.unlink(version.path));
            return instance.update(data)
              .then(final => res.json({ status: 'success', result, baseURL: aws.URL, instance: final }));
          }).catch(error => res.status(404).json({ error })))
        .catch(error => res.status(400).json({ error }));
    } else {
      next();
    }
  });

  return api;
};
