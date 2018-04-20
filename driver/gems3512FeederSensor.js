'use strict';

var util = require('util');

var SensorLib = require('../index');
var Sensor = SensorLib.Sensor;
var logger = Sensor.getLogger('Sensor');
var Gems3512Feeder = require('../gems3512Feeder');

function Gems3512FeederSensor(sensorInfo, options) {
  var self = this;
  var tokens;

  Sensor.call(self, sensorInfo, options);

  tokens = self.id.split('-');
  self.address = tokens[1].split(':')[0];
  self.port = tokens[1].split(':')[1];
  self.feedId = tokens[1].split(':')[2]
  self.field = tokens[2];

  self.parent = Gems3512Feeder.create(self.address, self.port, self.feedId);

  if (sensorInfo.model) {
    self.model = sensorInfo.model;
  }

  self.dataType = Gems3512FeederSensor.properties.dataTypes[self.model][0];

  self.parent.registerField(self);
}
util.inherits(Gems3512FeederSensor, Sensor);

Gems3512FeederSensor.properties = {
  supportedNetworks: ['gems3512-feeder-modbus-tcp'],
  dataTypes: {
    'gems3512FeederType' : ['string'],
    'gems3512LeakageCurrent' : ['current']
  },
  discoverable: false,
  addressable: true,
  recommendedInterval: 60000,
  maxInstances: 32,
  maxRetries: 8,
  idTemplate: '{gatewayId}-{deviceAddress}-{sequence}',
  onChange: {
    'gems3512FeederType': false,
    'gems3512LeakageCurrent' : true 
  },
  models: [
    'gems3512FeederType',
    'gems3512LeakageCurrent',
  ],
  category: 'sensor'
};


Gems3512FeederSensor.prototype._get = function (cb) {
  var self = this;


  logger.debug('Called _get():', self.id);

 var values = self.parent.getValues(self);
 if (values == undefined)  {
   var result = {
     status: 'on',
     id: self.id,
     result: {},
     time: {}
   };
  self.emit('data', result);
 }
 else {
   var result = {
     status: 'on',
     id: self.id,
    values: values
   };

  self.emit('data_array', result);
 }
};

Gems3512FeederSensor.prototype._enableChange = function () {
};

Gems3512FeederSensor.prototype._clear = function () {
};

module.exports = Gems3512FeederSensor;
