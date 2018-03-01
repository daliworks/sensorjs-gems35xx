'use strict';

var net = require('net');
var util = require('util');
var _ = require('lodash');
var async = require('async');
var modbus = require('modbus-tcp');
var EventEmitter = require('events').EventEmitter;
var Gems35xx = require('./gems35xx');
var logger = require('./index').Sensor.getLogger('Sensor');


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

function Gems35xxFeeder (parent, id) {
  var self = this;

  EventEmitter.call(self);

  self.feedId = id;
  self.parent = parent;
  self.run = false;
  self.interval = 10000;
  self.registerAddress = 30080 + id * 40;
  self.registerCount = 40;
  self.items = {
    type:           { value: 0, registered: false, offset: 0,  type: 'readUInt16BE', converter: FeederType },
    leakageCurrent: { value: 0, registered: false, offset: 1,  type: 'readUInt16BE', converter: ValueConverter},
    current:        { value: 0, registered: false, offset: 2,  type: 'readUInt32BE', converter: ValueConverter},
    power:          { value: 0, registered: false, offset: 4,  type: 'readInt32BE',  converter: ValueConverter},
    VAR:            { value: 0, registered: false, offset: 6,  type: 'readInt32BE',  converter: undefined},
    VA:             { value: 0, registered: false, offset: 8,  type: 'readUInt32BE', converter: undefined},
    PFAverage:      { value: 0, registered: false, offset: 10, type: 'readInt16BE',  converter: ValueConverter},
    currentUnbalance:{value: 0, registered: false, offset: 12, type: 'readUInt16BE', converter: ValueConverter},
    THDAverage:     { value: 0, registered: false, offset: 13, type: 'readUInt16BE', converter: ValueConverter},
    L1Current:      { value: 0, registered: false, offset: 16, type: 'readUInt32BE', converter: ValueConverter},
    L1Power:        { value: 0, registered: false, offset: 18, type: 'readInt32BE',  converter: ValueConverter},
    L1Phase:        { value: 0, registered: false, offset: 20, type: 'readUInt16BE', converter: ValueConverter},
    L1PowerFactor:  { value: 0, registered: false, offset: 21, type: 'readInt16BE',  converter: ValueConverter},
    L1PowerTHD:     { value: 0, registered: false, offset: 22, type: 'readUInt16BE', converter: ValueConverter},
    L2Current:      { value: 0, registered: false, offset: 24, type: 'readUInt32BE', converter: ValueConverter},
    L2Power:        { value: 0, registered: false, offset: 26, type: 'readInt32BE',  converter: ValueConverter},
    L2Phase:        { value: 0, registered: false, offset: 28, type: 'readUInt16BE', converter: ValueConverter},
    L2PowerFactor:  { value: 0, registered: false, offset: 29, type: 'readInt16BE',  converter: ValueConverter},
    L2PowerTHD:     { value: 0, registered: false, offset: 30, type: 'readUInt16BE', converter: ValueConverter},
    L3Current:      { value: 0, registered: false, offset: 32, type: 'readUInt32BE', converter: ValueConverter},
    L3Power:        { value: 0, registered: false, offset: 34, type: 'readInt32BE',  converter: ValueConverter},
    L3Phase:        { value: 0, registered: false, offset: 36, type: 'readUInt16BE', converter: ValueConverter},
    L3PowerFactor:  { value: 0, registered: false, offset: 37, type: 'readInt16BE',  converter: ValueConverter},
    L3PowerTHD:     { value: 0, registered: false, offset: 38, type: 'readUInt16BE', converter: ValueConverter}
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
      }
    });
  });
}

util.inherits(Gems35xxFeeder, EventEmitter);

function Gems35xxFeederCreate(address, port, id) {
  var gems35xx = Gems35xx.create(address, port);

  var gems35xxFeeder = gems35xx.getChild(id);
  if (gems35xxFeeder == undefined) {
    gems35xxFeeder = new Gems35xxFeeder(gems35xx, id);
    gems35xx.addChild(gems35xxFeeder);
 }

  return  gems35xxFeeder;
}

Gems35xxFeeder.prototype.registerField = function(sensor) {
  var self = this;
  var i;

  if (self.items[sensor.field] != undefined) {
    self.items[sensor.field].registered = true;
    self.parent.run();
  }
  else{
    logger.error('Undefined field tried to register : ', sensor.field);
  }
}

Gems35xxFeeder.prototype.getValue = function (sensor) {
  var self = this;

  if (self.items[sensor.field] != undefined) {
    return  self.items[sensor.field].value;
  }

  logger.error('Tried to get value of undefined field : ', sensor.field);
  return  undefined;
}

module.exports = {
  create: Gems35xxFeederCreate
};