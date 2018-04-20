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

function  scaleConverter(value, scale) {
  if (scale != undefined) {
    return  value * scale;
  }

  return  value;
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
      address : 39012 + (id - 1) * 18,
      count : 18 
    }
  ];
  self.items = {
    type:               { value: undefined, values: [], sensor: undefined, registered: false, address: 39012 + (id - 1) * 18 + 0,  type: 'readUInt16BE', converter: FeederType },
     leakageCurrent:    { value: undefined, values: [], sensor: undefined, registered: false, address: 39012 + (id - 1) * 18 + 2,  type: 'readUInt32BE', scaleConversion: { converter: scaleConverter, scale: 0.01 }},
    lGRLeakageCurrent:  { value: undefined, values: [], sensor: undefined, registered: false, address: 39012 + (id - 1) * 18 + 4, type: 'readInt32BE', scaleConversion: { converter: scaleConverter, scale: 0.1 }},
    lGCLeakageCurrent:  { value: undefined, values: [], sensor: undefined, registered: false, address: 39012 + (id - 1) * 18 + 6, type: 'readInt32BE', scaleConversion: { converter: scaleConverter, scale: 0.1 }},
  };

  self.on('done', function (startAddress, count, registers) {
    function setValue (item) {
      if (startAddress <= item.address && item.address < startAddress + count*2) {
        var value;
          var result = {
            status: 'on',
            id: item.sensor.id,
            values: []
          };

        var buffer = new Buffer(4);

        registers[item.address - startAddress].copy(buffer, 0);
        registers[item.address - startAddress + 1].copy(buffer, 2);

        if (item.converter != undefined) {
          value = item.converter(buffer[item.type](0) || 0);
        }
        if (item.scaleConversion != undefined) {
          value = item.scaleConversion.converter((buffer[item.type](0) || 0), item.scaleConversion.scale);
        }
        else {
          value = (buffer[item.type](0) || 0);
        }

        if (item.values.length > 100) {
            item.values.shift();
        }

        item.values.push({value: value, time: _.now()});

        if (item.sensor != undefined && ((item.value == undefined) || (Math.abs(item.value - value) >= 1) || (item.values.length >= 6))) {
          result.values = item.values;
          item.sensor.emit('change_array', result);
          item.values = [];
        }

        item.value = value;
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
    self.items[sensor.field].sensor = sensor;
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