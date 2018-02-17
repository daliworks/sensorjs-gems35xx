'use strict';

var util = require('util');

var SensorLib = require('../index');
var Sensor = SensorLib.Sensor;
var logger = Sensor.getLogger('Sensor');
var gems35xx = require('../gems35xx');

var addressTable = {
  VOLT_A: [40015, 'readFloatBE'],
  VOLT_B: [40017, 'readFloatBE'],
  VOLT_C: [40019, 'readFloatBE'],
  CURR_A: [40021, 'readFloatBE'],
  CURR_B: [40023, 'readFloatBE'],
  CURR_C: [40025, 'readFloatBE'],
  CURR_G: [40027, 'readFloatBE'],
  IMBALANCE_VOLT: [40029, 'readFloatBE'],
  IMBALANCE_CURR: [40031, 'readFloatBE'],
  TOTAL_RUNNING_TIME: [40033, 'readUInt32BE'],
  RUNNING_TIME: [40035, 'readUInt32BE'],
  TOTAL_WATTHR: [40037, 'readUInt32BE'],
  ACTIVE_POWER: [40049, 'readFloatBE'],
  REACTIVE_POWER: [40051, 'readFloatBE'],
  FREQ: [40053, 'readFloatBE'],
  PF: [40055, 'readFloatBE'],
  RUNS: [40225, 'readUInt32BE'],
};

function Gems35xxSensor(sensorInfo, options) {
  var self = this;
  var tokens;

  Sensor.call(self, sensorInfo, options);

  tokens = self.id.split('-');
  self.deviceAddress = tokens[1];
  self.sequence = tokens[2];

  if (sensorInfo.model) {
    self.model = sensorInfo.model;
  }

  self.dataType = Gems35xxSensor.properties.dataTypes[self.model][0];
}

Gems35xxSensor.properties = {
  supportedNetworks: ['modbus-tcp-gems35xx'],
  dataTypes: {
    'gems35xxVoltage': ['voltage'],
    'gems35xxCurrent': ['current'],
    'gems35xxCurrentMilli': ['current'],
    'gems35xxImbalance': ['percent'],
    'gems35xxTimeDuration': ['timeDuration'],
    'gems35xxElectricEnergy': ['electricEnergy'],
    'gems35xxElectricActivePower': ['electricPower'],
    'gems35xxElectricReactivePower': ['electricPower'],
    'gems35xxFrequency': ['frequency'],
    'gems35xxPowerFactor': ['powerFactor'],
    'gems35xxCount': ['count']
  },
  discoverable: false,
  addressable: true,
  recommendedInterval: 60000,
  maxInstances: 32,
  maxRetries: 8,
  idTemplate: '{gatewayId}-{deviceAddress}-{sequence}',
  models: [
    'gems35xxVoltage',
    'gems35xxCurrent',
    'gems35xxCurrentMilli',
    'gems35xxImbalance',
    'gems35xxTimeDuration',
    'gems35xxElectricEnergy',
    'gems35xxElectricActivePower',
    'gems35xxElectricReactivePower',
    'gems35xxFrequency',
    'gems35xxPowerFactor',
    'gems35xxCount'
  ],
  category: 'sensor'
};

util.inherits(Gems35xxSensor, Sensor);

Gems35xxSensor.prototype._get = function (cb) {
  var self = this;
  var result = {
    status: 'on',
    id: self.id,
    result: {},
    time: {}
  };

  logger.debug('Called _get():', self.id);

  gems35xx.getValue(self.deviceAddress, addressTable[self.sequence], function getValueCb(err, value) {
    if (err) {
      result.status = 'error';
      result.message = err.message ? err.message : 'Unknown error(No message)';
    } else {
      result.result[self.dataType] = value;
      result.time[self.dataType] = Date.now();
    }

    if (cb) {
      return cb(err, result);
    } else {
      self.emit('data', result);
    }
  });
};

Gems35xxSensor.prototype._enableChange = function () {
};

Gems35xxSensor.prototype._clear = function () {
};

module.exports = Gems35xxSensor;
