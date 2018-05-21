var util = require('util');
var SensorLib = require('../index');
var Sensor = SensorLib.Sensor;
var logger = Sensor.getLogger('Sensor');
var gems35xxBase = require('../gems35xxBase');

function Gems35xxBaseSensor(sensorInfo, options) {
  var self = this;
  var tokens;

  Sensor.call(self, sensorInfo, options);

  tokens = self.id.split('-');
  self.address = tokens[1].split(':')[0];
  self.port = tokens[1].split(':')[1];
  self.field = tokens[2];

  self.parent = gems35xxBase.create(self.address, self.port);

  if (sensorInfo.model) {
    self.model = sensorInfo.model;
  }

  self.dataType = Gems35xxBaseSensor.properties.dataTypes[self.model][0];

  self.parent.register(self);
}

util.inherits(Gems35xxBaseSensor, Sensor);

Gems35xxBaseSensor.properties = {
  supportedNetworks: ['gems35xx-base-modbus-tcp'],
  dataTypes: {
    'gems35xxBaseTemperature': ['temperature'],
    'gems35xxBaseFrequency': ['frequency'],
    'gems35xxBaseVoltage': ['voltage'],
    'gems35xxBaseVoltageUnbalance': ['percent']
  },
  discoverable: false,
  addressable: true,
  recommendedInterval: 60000,
  maxInstances: 32,
  maxRetries: 8,
  idTemplate: '{gatewayId}-{deviceAddress}-{sequence}',
  models: [
    'gems35xxBaseTemperature',
    'gems35xxBaseFrequency',
    'gems35xxBaseVoltage',
    'gems35xxBaseVoltageUnbalance'
  ],
  category: 'sensor'
};


Gems35xxBaseSensor.prototype._get = function (cb) {
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

Gems35xxBaseSensor.prototype._enableChange = function () {};

Gems35xxBaseSensor.prototype._clear = function () {};

module.exports = Gems35xxBaseSensor;
