'use strict';

var util = require('util');

var SensorLib = require('../index');
var Actuator = SensorLib.Actuator;
var _ = require('lodash');
var logger = Actuator.getLogger();
var meltem = require('../meltem');

function Gems35xxBaseActuator(sensorInfo, options) {
  var self = this;

  Actuator.call(self, sensorInfo, options);

  self.sequence = self.id.split('-')[2];
  self.deviceAddress = self.id.split('-')[1];
  self.gatewayId = self.id.split('-')[0];
  self.lastTime = 0;
  
  self.parent = Gems35xxBase.create(self.address, self.port);
  
  if (sensorInfo.model) {
    self.model = sensorInfo.model;
  }

  self.dataType = Gems35xxBaseActuator.properties.dataTypes[self.model][0];
  
  self.parent.registerField(self);
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
    gems35xxDemandReset: [ 'set', 'get' ]
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
  }
  catch(err) {
    cb('Invalid JSON format', err);
  }
}

Gems35xxBaseActuator.prototype._set = function (cmd, options, cb) {
  var self = this;

  try{
    if (options.settings != undefined) {
      var settings = JSON.parse(options.settings);
      self.master.emit(self.deviceAddress + '-' + self.sequence, settings);
    }
  }
  catch(err) {
    return cb && cb(err);
  }

}

Gems35xxBaseActuator.prototype._get = function (cmd, options, cb) {
  var self = this;
  
  sendCommand(self.shortId, cmd, options, function (err, result) {
    if(err) {
      self.myStatus = 'err';
    } else {
      self.myStatus = 'on';
    }
    return cb && cb(err, result);
  });
};

Gems35xxBaseActuator.prototype.getStatus = function () {
  return this.myStatus;
};

Gems35xxBaseActuator.prototype.connectListener = function () {
  this.myStatus = 'on';
};

Gems35xxBaseActuator.prototype.disconnectListener = function () {
  var rtn = {
    status: 'off',
    id: this.id,
    message: 'disconnected'
  };

  this.myStatus = 'off';
  this.emit('data', rtn);
};

module.exports = Gems35xxBaseActuator;
