var _ = require('lodash');
var util = require('util');
var SensorLib = require('../index');
var gems35xxBase = require('../gems35xxBase');
var logger = Actuator.getLogger();
var Actuator = SensorLib.Actuator;

function Gems35xxBaseActuator(sensorInfo, options) {
  var self = this;
  var tokens;

  Actuator.call(self, sensorInfo, options);

  tokens = self.id.split('-');
  self.address = tokens[1].split(':')[0];
  self.port = tokens[1].split(':')[1];
  self.field = tokens[2];
  self.lastTime = 0;

  if (sensorInfo.model) {
    self.model = sensorInfo.model;
  }

  self.dataType = Gems35xxBaseActuator.properties.dataTypes[self.model][0];

  try {
    self.parent = gems35xxBase.create(self.address, self.port);
    self.parent.register(self);
  } catch (err) {
    logger.error(err);
  }
}

Gems35xxBaseActuator.properties = {
  supportedNetworks: ['gems35xx-base-modbus-tcp'],
  dataTypes: {
    gems35xxDemandReset: ['powerSwitch']
  },
  models: [
    'gems35xxDemandReset'
  ],
  commands: {
    gems35xxDemandReset: ['on', 'off']
  },
  discoverable: false,
  addressable: true,
  recommendedInterval: 60000,
  maxInstances: 1,
  maxRetries: 8,
  idTemplate: '{gatewayId}-{deviceAddress}-{sequence}',
  category: 'actuator'
};

util.inherits(Gems35xxBaseActuator, Actuator);

function sendCommand(actuator, cmd, options, cb) {
  if (_.isFunction(options)) {
    cb = options;
    options = null;
  }

  logger.trace('sendCommand : ', actuator.deviceAddress, actuator.sequence, cmd, options);

  try {
    var settings = JSON.parse(options.settings);
    logger.trace('Settings : ', settings);

    cb(undefined, 'Success!');
  } catch (err) {
    cb('Invalid JSON format', err);
  }
}

Gems35xxBaseActuator.prototype._set = function _set(cmd, options, cb) {
  var self = this;

  try {
    switch (self.field) {
      case 'demandReset':
        self.parent.emit('demandReset', cb);
    }
  } catch (err) {
    return cb && cb(err);
  }
};

Gems35xxBaseActuator.prototype._get = function _get(cb) {
  var self = this;
  var result = {
    status: 'on',
    id: self.id,
    result: {},
    time: {}
  };

  logger.debug('Called _get():', self.id);

  result.result[self.dataType] = 'off';

  self.emit('data', result);
};

Gems35xxBaseActuator.prototype.getStatus = function getStatus() {
  var self = this;

  self.myStatus = 'on';

  return self.myStatus;
};

Gems35xxBaseActuator.prototype.connectListener = function connectListener() {
  var self = this;

  self.myStatus = 'on';
};

Gems35xxBaseActuator.prototype.disconnectListener = function disconnectListener() {
  var self = this;

  var rtn = {
    status: 'off',
    id: self.id,
    message: 'disconnected'
  };

  self.myStatus = 'off';
  self.emit('data', rtn);
};

module.exports = Gems35xxBaseActuator;
