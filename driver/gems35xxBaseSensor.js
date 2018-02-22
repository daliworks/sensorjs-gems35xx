'use strict';

var util = require('util');

var SensorLib = require('../index');
var Sensor = SensorLib.Sensor;
var logger = Sensor.getLogger('Sensor');
var gems35xx = require('../gems35xx');

function  TemperatureConverter(value) {
  return  value / 10.0;
}

function  FrequencyConverter(value) {
  return  value / 100;
}

function  ValueConverter(value) {
  return  value / 100.0;
}

var baseItemAddressTable = {
  temperature: [1, 'readUInt16BE', TemperatureConverter],
  frequency: [2, 'readUInt16BE', FrequencyConverter],
  V123LNAverage: [64, 'readUInt32BE', ValueConverter],
  V123LLAverage: [66, 'readUInt32BE', ValueConverter],
  V123LNUnbalance: [68, 'readUInt16BE', ValueConverter],
  V123LLUnbalance: [69, 'readUInt16BE', ValueConverter],
  V1: [70, 'readUInt32BE', ValueConverter],
  V12: [72, 'readUInt32BE', ValueConverter],
  V1Unbalance: [74, 'readUInt16BE', ValueConverter],
  V12Unbalance: [75, 'readUInt16BE', ValueConverter],
  V2: [76, 'readUInt32BE', ValueConverter],
  V23: [78, 'readUInt32BE', ValueConverter],
  V2Unbalance: [80, 'readUInt16BE', ValueConverter],
  V23Unbalance: [81, 'readUInt16BE', ValueConverter],
  V3: [82, 'readUInt32BE', ValueConverter],
  V31: [84, 'readUInt32BE', ValueConverter],
  V3Unbalance: [86, 'readUInt16BE', ValueConverter],
  V31Unbalance: [87, 'readUInt16BE', ValueConverter]
};

function Gems35xxBaseSensor(sensorInfo, options) {
  var self = this;
  var tokens;

  Sensor.call(self, sensorInfo, options);

  tokens = self.id.split('-');
  self.deviceAddress = tokens[1];
  self.sequence = tokens[2];
  self.baseAddress = 30000;
  self.addressTable = baseItemAddressTable;

  if (sensorInfo.model) {
    self.model = sensorInfo.model;
  }

  self.dataType = Gems35xxBaseSensor.properties.dataTypes[self.model][0];
}

Gems35xxBaseSensor.properties = {
  supportedNetworks: ['gems35xx-base-modbus-tcp'],
  dataTypes: {
    'gems35xxTemperature' : ['temperature'],
    'gems35xxFrequency' : ['frequency'],
    'gems35xxVoltage' : ['voltage'],
    'gems35xxVoltageUnbalance' : ['percent']
  },
  discoverable: false,
  addressable: true,
  recommendedInterval: 60000,
  maxInstances: 32,
  maxRetries: 8,
  idTemplate: '{gatewayId}-{deviceAddress}-{sequence}',
  models: [
    'gems35xxTemperature',
    'gems35xxFrequency',
    'gems35xxVoltage',
    'gems35xxVoltageUnbalance'
  ],
  category: 'sensor'
};

util.inherits(Gems35xxBaseSensor, Sensor);

Gems35xxBaseSensor.prototype._get = function (cb) {
  var self = this;
  var result = {
    status: 'on',
    id: self.id,
    result: {},
    time: {}
  };

  logger.debug('Called _get():', self.id);

  gems35xx.getValue(self.deviceAddress,  self.baseAddress, self.addressTable[self.sequence], function getValueCb(err, value) {
    if (err) {
      result.status = 'error';
      result.message = err.message ? err.message : 'Unknown error(No message)';
    } else {
      if (self.addressTable[self.sequence][2] != undefined) {
        result.result[self.dataType] = self.addressTable[self.sequence][2](value);
      }
      else {
        result.result[self.dataType] = value;
      }

      result.time[self.dataType] = Date.now();
    }

    if (cb) {
      return cb(err, result);
    } else {
      self.emit('data', result);
    }
  });
};

Gems35xxBaseSensor.prototype._enableChange = function () {
};

Gems35xxBaseSensor.prototype._clear = function () {
};

module.exports = Gems35xxBaseSensor;
