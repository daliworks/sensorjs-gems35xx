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
    case  3:  return  '1P2W_T(1P3W_SN)';
    case  4:  return  '3P2W_2CT';
    case  5:  return  '3P4W';
    case  6:  return  'ZCT';
    case  7:  return  '3P3W_3CT';
    case  8:  return  '1P3W_2CT';
  }

  return  'Unknown';
 }

function  leakageCurrentConverter(value) {
  return  value / 10.0;
}

function Gems3512Feeder (parent, id) {
  var self = this;

  EventEmitter.call(self);

  self.feedId = id;
  self.parent = parent;
  self.run = false;
  self.interval = 10000;
  self.addressSet = [
    {
      address : 32420 + (id - 1) * 64,
      count : 64
    },
    {
      address : 36000 + (id - 1) * 34,
      count : 34
    },
    {
      address : 38000 + (id - 1) * 18,
      count : 18 
    }
  ];
  self.items = {
    type:           { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 0,  type: 'readUInt16BE', converter: FeederType },
     leakageCurrent: { value: undefined, values: [], registered: false, address: 32421 + (id - 1) * 64 + 2,  type: 'readUInt32BE', converter: leakageCurrentConverter},
    lGCLeakageCurrent:     { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 14, type: 'readUInt16BE', converter: leakageCurrentConverter},
    lGRLeakageCurrent:     { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 15, type: 'readUInt16BE', converter: leakageCurrentConverter}
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

        if (item.values.length > 100) {
            item.values.shift();
        }

        item.values.push({value: item.value, time: _.now()});
      }
    };

    setValue(self.items.leakageCurrent);
    setValue(self.items.lGCLeakageCurrent);
    setValue(self.items.lGRLeakageCurrent);
  });
}

util.inherits(Gems3512Feeder, EventEmitter);

function Gems3512FeederCreate(address, port, id) {
  var gems35xx = Gems35xx.create(address, port);

  var gems3512Feeder = gems35xx.getChild(id);
  if (gems3512Feeder == undefined) {
    gems3512Feeder = new Gems3512Feeder(gems35xx, id);
    gems35xx.addChild(gems3512Feeder);
 }

  return  gems3512Feeder;
}

Gems3512Feeder.prototype.registerField = function(sensor) {
  var self = this;

  if (self.items[sensor.field] != undefined) {
    self.items[sensor.field].registered = true;
    self.parent.run();
  }
  else{
    logger.error('Undefined feeder field tried to register : ', sensor.field);
    logger.error(self.items);
  }
}

Gems3512Feeder.prototype.getValue = function (sensor) {
  var self = this;

  if (self.items[sensor.field] != undefined) {
    return  self.items[sensor.field].value;
  }

  logger.error('Tried to get value of undefined feeder field : ', sensor.field);
  return  undefined;
}

Gems3512Feeder.prototype.getValues = function (sensor) {
  var self = this;
  var values = [];

  if (self.items[sensor.field] != undefined) {
    values = self.items[sensor.field].values;
    self.items[sensor.field].values = [];
    return  values;
  }

  logger.error('Tried to get value of undefined feeder field : ', sensor.field);
  return  undefined;
}

module.exports = {
  create: Gems3512FeederCreate
};