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
function  EnergyConverter(value) {
  return  value / 10.0;
}

function Gems35xxFeeder (parent, id) {
  var self = this;

  EventEmitter.call(self);

  self.feedId = id;
  self.parent = parent;
  self.run = false;
  self.interval = 10000;
  self.addressSet = [
    {
      address : 30120 + (id - 1) * 40,
      count : 40
    },
    {
      address : 38000 + (id - 1) * 18,
      count : 18 
    }
  ];
  self.items = {
    type:           { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 0,  type: 'readUInt16BE', converter: FeederType },
    leakageCurrent: { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 1,  type: 'readUInt16BE', converter: ValueConverter},
    current:        { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 2,  type: 'readUInt32BE', converter: ValueConverter},
    power:          { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 4,  type: 'readInt32BE',  converter: ValueConverter},
    reactivePower:  { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 6,  type: 'readInt32BE',  converter: undefined},
    apparentPower:  { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 8,  type: 'readUInt32BE', converter: undefined},
    PFAverage:      { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 10, type: 'readInt16BE',  converter: ValueConverter},
    currentUnbalance:{value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 12, type: 'readUInt16BE', converter: ValueConverter},
    THDAverage:     { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 13, type: 'readUInt16BE', converter: ValueConverter},
    L1Current:      { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 16, type: 'readUInt32BE', converter: ValueConverter},
    L1Power:        { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 18, type: 'readInt32BE',  converter: ValueConverter},
    L1Phase:        { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 20, type: 'readUInt16BE', converter: ValueConverter},
    L1PowerFactor:  { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 21, type: 'readInt16BE',  converter: ValueConverter},
    L1PowerTHD:     { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 22, type: 'readUInt16BE', converter: ValueConverter},
    L2Current:      { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 24, type: 'readUInt32BE', converter: ValueConverter},
    L2Power:        { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 26, type: 'readInt32BE',  converter: ValueConverter},
    L2Phase:        { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 28, type: 'readUInt16BE', converter: ValueConverter},
    L2PowerFactor:  { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 29, type: 'readInt16BE',  converter: ValueConverter},
    L2PowerTHD:     { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 30, type: 'readUInt16BE', converter: ValueConverter},
    L3Current:      { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 32, type: 'readUInt32BE', converter: ValueConverter},
    L3Power:        { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 34, type: 'readInt32BE',  converter: ValueConverter},
    L3Phase:        { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 36, type: 'readUInt16BE', converter: ValueConverter},
    L3PowerFactor:  { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 37, type: 'readInt16BE',  converter: ValueConverter},
    L3PowerTHD:     { value: undefined, registered: false, address: 30120 + (id - 1) * 40 + 38, type: 'readUInt16BE', converter: ValueConverter},
    energy:                 { value: undefined, registered: false, address: 38000 + (id - 1) * 18,      type: 'readUInt32BE', converter: EnergyConverter},
    thisMonthEnergy:        { value: undefined, registered: false, address: 38000 + (id - 1) * 18 + 2,  type: 'readUInt32BE', converter: EnergyConverter},
    lastMonthEnergy:        { value: undefined, registered: false, address: 38000 + (id - 1) * 18 + 4,  type: 'readUInt32BE', converter: EnergyConverter},
    reactiveEnergy:         { value: undefined, registered: false, address: 38000 + (id - 1) * 18 + 6,  type: 'readUInt32BE', converter: EnergyConverter},
    thisMonthReactiveEnergy:{ value: undefined, registered: false, address: 38000 + (id - 1) * 18 + 8,  type: 'readUInt32BE', converter: EnergyConverter},
    lastMonthReactiveEnergy:{ value: undefined, registered: false, address: 38000 + (id - 1) * 18 + 10, type: 'readUInt32BE', converter: EnergyConverter},
    apparentEnergy:         { value: undefined, registered: false, address: 38000 + (id - 1) * 18 + 12, type: 'readUInt32BE', converter: EnergyConverter},
    thisMonthApparentEnergy:{ value: undefined, registered: false, address: 38000 + (id - 1) * 18 + 14, type: 'readUInt32BE', converter: EnergyConverter},
    lastMonthApparentEnergy:{ value: undefined, registered: false, address: 38000 + (id - 1) * 18 + 16, type: 'readUInt32BE', converter: EnergyConverter}
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

    setValue(self.items.type);
    setValue(self.items.leakageCurrent);
    setValue(self.items.current);
    setValue(self.items.power);
    setValue(self.items.reactivePower);
    setValue(self.items.apparentPower);
    setValue(self.items.PFAverage);
    setValue(self.items.currentUnbalance);
    setValue(self.items.THDAverage);
    setValue(self.items.L1Current);
    setValue(self.items.L1Power);
    setValue(self.items.L1Phase);
    setValue(self.items.L1PowerFactor);
    setValue(self.items.L1PowerTHD);
    setValue(self.items.L2Current);
    setValue(self.items.L2Power);
    setValue(self.items.L2Phase);
    setValue(self.items.L2PowerFactor);
    setValue(self.items.L2PowerTHD);
    setValue(self.items.L3Current);
    setValue(self.items.L3Power);
    setValue(self.items.L3Phase);
    setValue(self.items.L3PowerFactor);
    setValue(self.items.L3PowerTHD);
    setValue(self.items.energy);
    setValue(self.items.thisMonthEnergy);
    setValue(self.items.lastMonthEnergy);
    setValue(self.items.reactiveEnergy);
    setValue(self.items.thisMonthReactiveEnergy);
    setValue(self.items.lastMonthReactiveEnergy);
    setValue(self.items.apparentEnergy);
    setValue(self.items.thisMonthApparentEnergy);
    setValue(self.items.lastMonthApparentEnergy);
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