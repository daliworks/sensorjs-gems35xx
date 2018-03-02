'use strict';

var util = require('util');

var SensorLib = require('../index');
var Sensor = SensorLib.Sensor;
var logger = Sensor.getLogger('Sensor');
var Gems35xxFeeder = require('../gems35xxFeeder');

function Gems35xxFeederSensor(sensorInfo, options) {
  var self = this;
  var tokens;

  Sensor.call(self, sensorInfo, options);

  tokens = self.id.split('-');
  self.address = tokens[1].split(':')[0];
  self.port = tokens[1].split(':')[1];
  self.feedId = tokens[1].split(':')[2]
  self.field = tokens[2];

  self.parent = Gems35xxFeeder.create(self.address, self.port, self.feedId);

  if (sensorInfo.model) {
    self.model = sensorInfo.model;
  }

  self.dataType = Gems35xxFeederSensor.properties.dataTypes[self.model][0];

  self.parent.registerField(self);
}
util.inherits(Gems35xxFeederSensor, Sensor);

Gems35xxFeederSensor.properties = {
  supportedNetworks: ['gems35xx-feeder-modbus-tcp'],
  dataTypes: {
    'gems35xxFeederType' : ['string'],
    'gems35xxCurrent' : ['current'],
    'gems35xxPower' : ['electricPower'],
    'gems35xxReactivePower' : ['electricPower'],
    'gems35xxApparentPower' : ['electricPower'],
    'gems35xxEnergy' : ['electricEnergy'],
    'gems35xxReactiveEnergy' : ['electricEnergy'],
    'gems35xxApparentEnergy' : ['electricEnergy'],
    'gems35xxPowerFactor' : ['powerFactor'],
    'gems35xxLeakageCurrent' : ['current'],
    "gems35xxPFAverage" : ['powerFactor'],
    "gems35xxCurrentUnbalance" : ['percent'],
    "gems35xxTHDAverage" : ['percent'],
    "gems35xxPowerTHD" : ['percent'],
    "gems35xxPhase"  : ['number']  
  },
  discoverable: false,
  addressable: true,
  recommendedInterval: 60000,
  maxInstances: 32,
  maxRetries: 8,
  idTemplate: '{gatewayId}-{deviceAddress}-{sequence}',
  models: [
    'gems35xxFeederType',
    'gems35xxCurrent',
    'gems35xxEnergy',
    'gems35xxReactiveEnergy',
    'gems35xxApparentEnergy',
    'gems35xxPower',
    'gems35xxReactivePower',
    'gems35xxApparentPower',
    'gems35xxPowerFactor',
    'gems35xxLeakageCurrent',
    'gems35xxPFAverage',
    'gems35xxCurrentUnbalance',
    'gems35xxTHDAverage',
    'gems35xxPowerTHD',
    'gems35xxPhase'
  ],
  category: 'sensor'
};


Gems35xxFeederSensor.prototype._get = function (cb) {
  var self = this;
  var result = {
    status: 'on',
    id: self.id,
    result: {},
    time: {}
  };

  logger.debug('Called _get():', self.id);

  result.result[self.dataType] = self.parent.getValue(self);

  self.emit('data', result);
};

Gems35xxFeederSensor.prototype._enableChange = function () {
};

Gems35xxFeederSensor.prototype._clear = function () {
};

module.exports = Gems35xxFeederSensor;
