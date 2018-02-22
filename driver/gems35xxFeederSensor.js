'use strict';

var util = require('util');

var SensorLib = require('../index');
var Sensor = SensorLib.Sensor;
var logger = Sensor.getLogger('Sensor');
var gems35xx = require('../gems35xx');

function  FeederType(value) {
  switch(value) {
    case  0:  return  'Not Used';
    case  1:  return  '1P2W_R(1P3W_RN)';
    case  2:  return  '1P2W_S(1P3W_RS)';
    case  3:  return  '1P2W_T(1P3WSN)';
    case  4:  return  '3P2W_2CT';
    case  5:  return  '3P4W';
    case  6:  return  'ZCT';
    case  7:  return  '3P3W_3CT';
    case  8:  return  '1P3W_2CT';
  }

  return  'Unknown';
 }

function  ValueConverter(value) {
  return  value / 100.0;
}

var feederItemOffsetTable = {
  type: [0, 'readUInt16BE', FeederType],
  leakageCurrent: [1, 'readUInt16BE', ValueConverter],
  current: [2, 'readUInt32BE', ValueConverter],
  power: [4, 'readInt32BE', ValueConverter],
  VAR: [6, 'readInt32BE', undefined],
  VA: [8, 'readUInt32BE', undefined],
  PFAverage: [10, 'readInt16BE', ValueConverter],
  currentUnbalance: [12, 'readUInt16BE', ValueConverter],
  THDAverage: [13, 'readUInt16BE', ValueConverter],
  L1Current: [16, 'readUInt32BE', ValueConverter],
  L1Power: [18, 'readInt32BE', ValueConverter],
  L1Phase: [20, 'readUInt16BE', ValueConverter],
  L1PowerFactor: [21, 'readInt16BE', ValueConverter],
  L1PowerTHD: [22, 'readUInt16BE', ValueConverter],
  L2Current: [24, 'readUInt32BE', ValueConverter],
  L2Power: [26, 'readInt32BE', ValueConverter],
  L2Phase: [28, 'readUInt16BE', ValueConverter],
  L2PowerFactor: [29, 'readInt16BE', ValueConverter],
  L2PowerTHD: [30, 'readUInt16BE', ValueConverter],
  L3Current: [32, 'readUInt32BE', ValueConverter],
  L3Power: [34, 'readInt32BE', ValueConverter],
  L3Phase: [36, 'readUInt16BE', ValueConverter],
  L3PowerFactor: [37, 'readInt16BE', ValueConverter],
  L3PowerTHD: [38, 'readUInt16BE', ValueConverter]
};

function Gems35xxFeederSensor(sensorInfo, options) {
  var self = this;
  var tokens;

  Sensor.call(self, sensorInfo, options);

  tokens = self.id.split('-');
  self.deviceAddress = tokens[1].split(':')[0] + ':' + tokens[1].split(':')[1];
  self.feederId = tokens[1].split(':')[2];
  self.sequence = tokens[2];
  if (self.feederId != undefined) {
    self.baseAddress = 30120 + (parseInt(self.feederId) - 1) * 40;
    self.addressTable = feederItemOffsetTable;
  }

  if (sensorInfo.model) {
    self.model = sensorInfo.model;
  }

  self.dataType = Gems35xxFeederSensor.properties.dataTypes[self.model][0];
}

Gems35xxFeederSensor.properties = {
  supportedNetworks: ['gems35xx-feeder-modbus-tcp'],
  dataTypes: {
    'gems35xxFeederType' : ['string'],
    'gems35xxCurrent' : ['current'],
    'gems35xxPower' : ['power'],
    'gems35xxPowerFactor' : ['powerFactor'],
    'gems35xxLeakageCurrent' : ['current'],
    'gems35xxVAR' : ['number'],
    'gems35xxVA' : ['number'],
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
    'gems35xxPower',
    'gems35xxPowerFactor',
    'gems35xxLeakageCurrent',
    'gems35xxVAR',
    'gems35xxVA',
    'gems35xxPFAverage',
    'gems35xxCurrentUnbalance',
    'gems35xxTHDAverage',
    'gems35xxPowerTHD',
    'gems35xxPhase'
  ],
  category: 'sensor'
};

util.inherits(Gems35xxFeederSensor, Sensor);

Gems35xxFeederSensor.prototype._get = function (cb) {
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

Gems35xxFeederSensor.prototype._enableChange = function () {
};

Gems35xxFeederSensor.prototype._clear = function () {
};

module.exports = Gems35xxFeederSensor;
