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
  self.registerAddress = 30000;
  self.registerCount = 104;  
  self.items = {
    temperature:    { value: 0, registered: false, offset: 1,  type: 'readUInt16BE', converter: TemperatureConverter },
    frequency:      { value: 0, registered: false, offset: 2,  type: 'readUInt16BE', converter: FrequencyConverter},
    V123LNAverage:  { value: 0, registered: false, offset: 64, type: 'readUInt32BE', converter: ValueConverter},
    V123LLAverage:  { value: 0, registered: false, offset: 66, type: 'readUInt32BE', converter: ValueConverter},
    V123LNUnbalance:{ value: 0, registered: false, offset: 68, type: 'readUInt16BE', converter: ValueConverter},
    V123LLUnbalance:{ value: 0, registered: false, offset: 69, type: 'readUInt16BE', converter: ValueConverter},
    V1:             { value: 0, registered: false, offset: 70, type: 'readUInt32BE', converter: ValueConverter},
    V12:            { value: 0, registered: false, offset: 72, type: 'readUInt32BE', converter: ValueConverter},
    V1Unbalance:    { value: 0, registered: false, offset: 74, type: 'readUInt16BE', converter: ValueConverter},
    V12Unbalance:   { value: 0, registered: false, offset: 75, type: 'readUInt16BE', converter: ValueConverter},
    V2:             { value: 0, registered: false, offset: 76, type: 'readUInt32BE', converter: ValueConverter},
    V23:            { value: 0, registered: false, offset: 78, type: 'readUInt32BE', converter: ValueConverter},
    V2Unbalance:    { value: 0, registered: false, offset: 80, type: 'readUInt16BE', converter: ValueConverter},
    V23Unbalance:   { value: 0, registered: false, offset: 81, type: 'readUInt16BE', converter: ValueConverter},
    V3:             { value: 0, registered: false, offset: 82, type: 'readUInt32BE', converter: ValueConverter},
    V31:            { value: 0, registered: false, offset: 84, type: 'readUInt32BE', converter: ValueConverter},
    V3Unbalance:    { value: 0, registered: false, offset: 86, type: 'readUInt16BE', converter: ValueConverter},
    V31Unbalance:   { value: 0, registered: false, offset: 87, type: 'readUInt16BE', converter: ValueConverter}  
  };
  self.on('done', function (registers) {
    self.items.forEach(function (item) {
      var buffer = new Buffer(4);

      registers[item.offset].copy(buffer, 0);
      registers[item.offset + 1].copy(buffer, 2);

      if (item.converter != undefined) {
        item.value = item.converter(buffer[item.type](0) || 0);
      }
      else {
        item.value = (buffer[item.type](0) || 0);
      }    });
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
