'use strict';

var net = require('net');
var util = require('util');
var _ = require('lodash');
var async = require('async');
var modbus = require('modbus-tcp');
var EventEmitter = require('events').EventEmitter;
var Gems35xx = require('./gems35xx');
var logger = require('./index').Sensor.getLogger('Sensor');

function  TemperatureConverter(value) {
  return  value / 10.0;
}

function  FrequencyConverter(value) {
  return  value / 100;
}


function  ValueConverter(value) {
  return  value / 100.0;
}

function Gems35xxBase (parent) {
  var self = this;

  EventEmitter.call(self);

  self.parent = parent;
  self.feedId = 0;
  self.run = false;
  self.interval = 10000;
  self.addressSet = [
    {
      address: 30000,
      count: 104
    },
    {
      address: 40120,
      count: 1
    }
  ];

  self.sensors = {
    temperature:    { value: undefined, registered: false, address: 30001, type: 'readUInt16BE', converter: TemperatureConverter },
    frequency:      { value: undefined, registered: false, address: 30002, type: 'readUInt16BE', converter: FrequencyConverter},
    v123LNVoltageAverage:  { value: undefined, registered: false, address: 30064, type: 'readUInt32BE', converter: ValueConverter},
    v123LLVoltageAverage:  { value: undefined, registered: false, address: 30066, type: 'readUInt32BE', converter: ValueConverter},
    v123LNVoltageUnbalance:{ value: undefined, registered: false, address: 30068, type: 'readUInt16BE', converter: ValueConverter},
    v123LLVoltageUnbalance:{ value: undefined, registered: false, address: 30069, type: 'readUInt16BE', converter: ValueConverter},
    v1Voltage:            { value: undefined, registered: false, address: 30070, type: 'readUInt32BE', converter: ValueConverter},
    v12Voltage:           { value: undefined, registered: false, address: 30072, type: 'readUInt32BE', converter: ValueConverter},
    v1VoltageUnbalance:    { value: undefined, registered: false, address: 30074, type: 'readUInt16BE', converter: ValueConverter},
    v12VoltageUnbalance:   { value: undefined, registered: false, address: 30075, type: 'readUInt16BE', converter: ValueConverter},
    v2Voltage:             { value: undefined, registered: false, address: 30076, type: 'readUInt32BE', converter: ValueConverter},
    v23Voltage:            { value: undefined, registered: false, address: 30078, type: 'readUInt32BE', converter: ValueConverter},
    v2VoltageUnbalance:    { value: undefined, registered: false, address: 30080, type: 'readUInt16BE', converter: ValueConverter},
    v23VoltageUnbalance:   { value: undefined, registered: false, address: 30081, type: 'readUInt16BE', converter: ValueConverter},
    v3Voltage:             { value: undefined, registered: false, address: 30082, type: 'readUInt32BE', converter: ValueConverter},
    v31Voltage:            { value: undefined, registered: false, address: 30084, type: 'readUInt32BE', converter: ValueConverter},
    v3VoltageUnbalance:    { value: undefined, registered: false, address: 30086, type: 'readUInt16BE', converter: ValueConverter},
    v31VoltageUnbalance:   { value: undefined, registered: false, address: 30087, type: 'readUInt16BE', converter: ValueConverter}  
  };

  self.actuators={
    demandReset:    { value: undefined, registered: false, address: 40120, type: 'readUInt16BE', writeType: 'writeUInt16BE', converter: undefined }  

  };

  self.on('done', function (startAddress, count, registers) {
    function setValue (item) {
      if (startAddress <= item.address && item.address < startAddress + count*2) {
        var buffer = new Buffer(4);

        registers[item.address - startAddress].copy(buffer, 0);
        registers[item.address - startAddress + 1].copy(buffer, 2);

        if (item.converter != undefined) {
          item.value = item.converter(buffer[item.type](0) || 0);
        }
        else {
          item.value = (buffer[item.type](0) || 0);
        }
      }
    };

    setValue(self.sensors.temperature);
    setValue(self.sensors.frequency);
    setValue(self.sensors.v123LNVoltageAverage);
    setValue(self.sensors.v123llvoltageaverage);
    setvalue(self.sensors.v123LNVoltageUnbalance);
    setValue(self.sensors.v123LLVoltageUnbalance);
    setValue(self.sensors.v1Voltage);
    setValue(self.sensors.v12Voltage);
    setValue(self.sensors.v1VoltageUnbalance);
    setValue(self.sensors.v12VoltageUnbalance);
    setValue(self.sensors.v2Voltage);
    setValue(self.sensors.v23Voltage);
    setValue(self.sensors.v2VoltageUnbalance);
    setValue(self.sensors.v23VoltageUnbalance);
    setValue(self.sensors.v3Voltage);
    setValue(self.sensors.v31Voltage);
    setValue(self.sensors.v3VoltageUnbalance);
    setValue(self.sensors.v31VoltageUnbalance);
    setValue(self.actuators.demandReset);
  });

  self.on('demandReset', function (cb) {
    var field = 'demandReset';

    if (self.actuators[field] != undefined) {
      var registers = [];
      logger.trace('Request Command : ', field);

      registers[0] = new Buffer(4);
      registers[0][self.actuators[field].writeType](0x1234, 0);
      registers[0][self.actuators[field].writeType](0, 2);
      self.parent.setValue(self.actuators[field].address, 1, registers, cb);
    }
  });
}

util.inherits(Gems35xxBase, EventEmitter);

function Gems35xxBaseCreate(address, port) {
  var gems35xx = Gems35xx.create(address, port);

  var gems35xxBase = gems35xx.getChild(0);
  if (gems35xxBase == undefined) {
    gems35xxBase = new Gems35xxBase(gems35xx);
    logger.trace('GEMS35xx is created.');
    gems35xx.addChild(gems35xxBase);
  }

  return  gems35xxBase;
}

Gems35xxBase.prototype.register = function(endpoint) {
  var self = this;

  if (self.sensors[endpoint.field] != undefined) {
    self.sensors[endpoint.field].registered = true;
    self.parent.run();
  }
  else if (self.actuators[endpoint.field] != undefined) {
    self.actuators[endpoint.field].registered = true;
  }
  else{
    logger.error('Undefined base field tried to register : ', endpoint.field);
  }
}

Gems35xxBase.prototype.getValue = function (endpoint) {
  var self = this;

  if (self.sensors[endpoint.field] != undefined) {
    return  self.sensors[endpoint.field].value;
  }
  else if (self.actuators[endpoint.field] != undefined) {
    return  self.actuators[endpoint.field].value;
  }

  logger.error('Tried to get value of undefined field : ', endpoint.field);
  return  undefined;
}

module.exports = 
{
  create: Gems35xxBaseCreate
}
