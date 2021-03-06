'use strict';

var util = require('util');
var SensorLib = require('../index');
var Sensor = SensorLib.Sensor;
var logger = Sensor.getLogger('Sensor');
var gems35xxFeeder = require('../gems35xxFeeder');

function Gems35xxFeederSensor(sensorInfo, options) {
  var self = this;
  var tokens;

  Sensor.call(self, sensorInfo, options);

  tokens = self.id.split('-');
  self.address = tokens[1].split(':')[0];
  self.port = tokens[1].split(':')[1];
  self.feedId = tokens[1].split(':')[2];
  self.field = tokens[2];

  self.parent = gems35xxFeeder.create(self.address, self.port, self.feedId);

  if (sensorInfo.model) {
    self.model = sensorInfo.model;
  }

  self.onChange = Gems35xxFeederSensor.properties.dataTypes[self.model];
  self.dataType = Gems35xxFeederSensor.properties.dataTypes[self.model][0];

  self.parent.registerField(self);
  self.parent.on(self.field, function onData(data) {
    var result = {
      status: 'on',
      id: self.id,
      result: {},
      time: {}
    };

    result.result[self.dataType] = data.value;
    result.time[self.dataType] = self.lastTime = new Date().getTime();

    if (self.onChange) {
      self.emit('change', result);
    }
    else {
      self.emit('data', result);
    }
  });

}
util.inherits(Gems35xxFeederSensor, Sensor);

Gems35xxFeederSensor.properties = {
  supportedNetworks: ['gems35xx-feeder-modbus-tcp'],
  dataTypes: {
    'gems35xxFeederType': ['string'],
    'gems35xxVoltage': ['voltage'],
    'gems35xxCurrent': ['current'],
    'gems35xxPower': ['electricPower'],
    'gems35xxReactivePower': ['electricPower'],
    'gems35xxApparentPower': ['electricPower'],
    'gems35xxEnergy': ['electricEnergy'],
    'gems35xxReactiveEnergy': ['electricEnergy'],
    'gems35xxApparentEnergy': ['electricEnergy'],
    'gems35xxPowerFactor': ['powerFactor'],
    'gems35xxLeakageCurrent': ['current'],
    'gems35xxPFAverage': ['powerFactor'],
    'gems35xxVoltageUnbalance': ['percent'],
    'gems35xxCurrentUnbalance': ['percent'],
    'gems35xxTHDAverage': ['percent'],
    'gems35xxPowerTHD': ['percent'],
    'gems35xxPhase': ['number'],
    'gems35xxDemandCurrent': ['current'],
    'gems35xxDemandMaxCurrent': ['current'],
    'gems35xxDemandPower': ['electricPower'],
    'gems35xxDemandMaxPower': ['electricPower'],
    'gems35xxDemandPredictionPower': ['electricPower'],
    'gems35xxDemandCurrentPower': ['electricPower']
  },
  discoverable: false,
  addressable: true,
  recommendedInterval: 60000,
  maxInstances: 32,
  maxRetries: 8,
  idTemplate: '{gatewayId}-{deviceAddress}-{sequence}',
  onChange: {
    'gems35xxFeederType': false,
    'gems35xxVoltage': false,
    'gems35xxCurrent': false,
    'gems35xxEnergy': false,
    'gems35xxReactiveEnergy': false,
    'gems35xxApparentEnergy': false,
    'gems35xxPower': false,
    'gems35xxReactivePower': false,
    'gems35xxApparentPower': false,
    'gems35xxPowerFactor': false,
    'gems35xxLeakageCurrent': false,
    'gems35xxPFAverage': false,
    'gems35xxVoltageUnbalance': false,
    'gems35xxCurrentUnbalance': false,
    'gems35xxTHDAverage': false,
    'gems35xxPowerTHD': false,
    'gems35xxPhase': false,
    'gems35xxDemandCurrent': false,
    'gems35xxDemandMaxCurrent': false,
    'gems35xxDemandPower': false,
    'gems35xxDemandMaxPower': false,
    'gems35xxDemandPredictionPower': false,
    'gems35xxDemandCurrentPower': true
  },
  models: [
    'gems35xxFeederType',
    'gems35xxVoltage',
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
    'gems35xxVoltageUnbalance',
    'gems35xxCurrentUnbalance',
    'gems35xxTHDAverage',
    'gems35xxPowerTHD',
    'gems35xxPhase',
    'gems35xxDemandCurrent',
    'gems35xxDemandMaxCurrent',
    'gems35xxDemandPower',
    'gems35xxDemandMaxPower',
    'gems35xxDemandPredictionPower',
    'gems35xxDemandCurrentPower'
  ],
  category: 'sensor'
};


Gems35xxFeederSensor.prototype._get = function () {
  var self = this;
  var result = {
    status: 'on',
    id: self.id
  };

  logger.debug('Called _get():', self.id);

  var values = self.parent.getValues(self);
  if (!values) {
    result.result = {};
    result.time = {};

    self.emit('data', result);
  } else {
    result.values = values;

    self.emit('data_array', result);
  }
};

Gems35xxFeederSensor.prototype._enableChange = function () {};

Gems35xxFeederSensor.prototype._clear = function () {};

module.exports = Gems35xxFeederSensor;
