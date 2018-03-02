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
    }
  ];
  self.items= {
    temperature:    { value: undefined, registered: false, address: 30001, type: 'readUInt16BE', converter: TemperatureConverter },
    frequency:      { value: undefined, registered: false, address: 30002, type: 'readUInt16BE', converter: FrequencyConverter},
    V123LNAverage:  { value: undefined, registered: false, address: 30064, type: 'readUInt32BE', converter: ValueConverter},
    V123LLAverage:  { value: undefined, registered: false, address: 30066, type: 'readUInt32BE', converter: ValueConverter},
    V123LNUnbalance:{ value: undefined, registered: false, address: 30068, type: 'readUInt16BE', converter: ValueConverter},
    V123LLUnbalance:{ value: undefined, registered: false, address: 30069, type: 'readUInt16BE', converter: ValueConverter},
    V1:             { value: undefined, registered: false, address: 30070, type: 'readUInt32BE', converter: ValueConverter},
    V12:            { value: undefined, registered: false, address: 30072, type: 'readUInt32BE', converter: ValueConverter},
    V1Unbalance:    { value: undefined, registered: false, address: 30074, type: 'readUInt16BE', converter: ValueConverter},
    V12Unbalance:   { value: undefined, registered: false, address: 30075, type: 'readUInt16BE', converter: ValueConverter},
    V2:             { value: undefined, registered: false, address: 30076, type: 'readUInt32BE', converter: ValueConverter},
    V23:            { value: undefined, registered: false, address: 30078, type: 'readUInt32BE', converter: ValueConverter},
    V2Unbalance:    { value: undefined, registered: false, address: 30080, type: 'readUInt16BE', converter: ValueConverter},
    V23Unbalance:   { value: undefined, registered: false, address: 30081, type: 'readUInt16BE', converter: ValueConverter},
    V3:             { value: undefined, registered: false, address: 30082, type: 'readUInt32BE', converter: ValueConverter},
    V31:            { value: undefined, registered: false, address: 30084, type: 'readUInt32BE', converter: ValueConverter},
    V3Unbalance:    { value: undefined, registered: false, address: 30086, type: 'readUInt16BE', converter: ValueConverter},
    V31Unbalance:   { value: undefined, registered: false, address: 30087, type: 'readUInt16BE', converter: ValueConverter}  
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

    setValue(self.items.temperature);
    setValue(self.items.frequency);
    setValue(self.items.V123LNAverage);
    setValue(self.items.V123LLAverage);
    setValue(self.items.V123LNUnbalance);
    setValue(self.items.V123LLUnbalance);
    setValue(self.items.V1);
    setValue(self.items.V12);
    setValue(self.items.V1Unbalance);
    setValue(self.items.V12Unbalance);
    setValue(self.items.V2);
    setValue(self.items.V23);
    setValue(self.items.V2Unbalance);
    setValue(self.items.V23Unbalance);
    setValue(self.items.V3);
    setValue(self.items.V31);
    setValue(self.items.V3Unbalance);
    setValue(self.items.V31Unbalance);
  });

}

util.inherits(Gems35xxBase, EventEmitter);

function Gems35xxBaseCreate(address, port) {
  var gems35xx = Gems35xx.create(address, port);

  var gems35xxBase = gems35xx.getChild(0);
  if (gems35xxBase == undefined) {
    gems35xxBase = new Gems35xxBase(gems35xx);
    gems35xx.addChild(gems35xxBase);
  }

  return  gems35xxBase;
}

Gems35xxBase.prototype.registerField = function(sensor) {
  var self = this;

  if (self.items[sensor.field] != undefined) {
    self.items[sensor.field].registered = true;
    self.parent.run();
  }
  else{
    logger.error('Undefined field tried to register : ', sensor.field);
  }
}

Gems35xxBase.prototype.getValue = function (sensor) {
  var self = this;

  if (self.items[sensor.field] != undefined) {
    return  self.items[sensor.field].value;
  }

  logger.error('Tried to get value of undefined field : ', sensor.field);
  return  undefined;
}

module.exports = 
{
  create: Gems35xxBaseCreate
}
