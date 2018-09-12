'use strict';

var util = require('util');
var SensorLib = require('../index');
var Sensor = SensorLib.Sensor;
var logger = Sensor.getLogger('Sensor');
var gems3512Feeder = require('../gems3512Feeder');

function Gems3512FeederSensor(sensorInfo, options) {
  var self = this;
  var tokens;

  Sensor.call(self, sensorInfo, options);

  tokens = self.id.split('-');
  self.address = tokens[1].split(':')[0];
  self.port = tokens[1].split(':')[1];
  self.feedId = tokens[1].split(':')[2];
  self.field = tokens[2];

  self.parent = gems3512Feeder.create(self.address, self.port, self.feedId);

  if (sensorInfo.model) {
    self.model = sensorInfo.model;
  }

  self.onChange = Gems3512FeederSensor.properties.onChange[self.model];
  self.dataType = Gems3512FeederSensor.properties.dataTypes[self.model][0];

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
util.inherits(Gems3512FeederSensor, Sensor);

Gems3512FeederSensor.properties = {
  supportedNetworks: ['gems3512-feeder-modbus-tcp'],
  dataTypes: {
    'gems3512FeederType' : ['string'],
    'gems3512LeakageCurrent' : ['current'],
    'gems3512LeakageCurrentOver' : ['number'],
    'gems3512LeakageCurrentAlarm' : ['onoff']
  },
  discoverable: false,
  addressable: true,
  recommendedInterval: 60000,
  maxInstances: 32,
  maxRetries: 8,
  idTemplate: '{gatewayId}-{deviceAddress}-{sequence}',
  onChange: {
    'gems3512FeederType': false,
    'gems3512LeakageCurrent' : true,
    'gems3512LeakageCurrentOver' : true,
    'gems3512LeakageCurrentAlarm' : true
  },
  models: [
    'gems3512FeederType',
    'gems3512LeakageCurrent',
    'gems3512LeakageCurrentOver',
    'gems3512LeakageCurrentAlarm'
  ],
  category: 'sensor'
};


Gems3512FeederSensor.prototype._get = function() {
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

Gems3512FeederSensor.prototype._enableChange = function () {};

Gems3512FeederSensor.prototype._clear = function () {};

module.exports = Gems3512FeederSensor;
