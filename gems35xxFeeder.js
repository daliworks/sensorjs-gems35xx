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
    leakageCurrent: { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 1,  type: 'readUInt16BE', converter: ValueConverter},
    current:        { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 2,  type: 'readUInt32BE', converter: ValueConverter},
    power:          { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 4,  type: 'readInt32BE',  converter: ValueConverter},
    reactivePower:  { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 6,  type: 'readInt32BE',  converter: undefined},
    apparentPower:  { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 8,  type: 'readUInt32BE', converter: undefined},
    PFAverage:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 10, type: 'readInt16BE',  converter: ValueConverter},
    currentUnbalance:{value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 12, type: 'readUInt16BE', converter: ValueConverter},
    THDAverage:     { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 13, type: 'readUInt16BE', converter: ValueConverter},
    voltageL1:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 16, type: 'readUInt32BE', converter: ValueConverter},
    currentL1:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 18, type: 'readUInt32BE', converter: ValueConverter},
    powerL1:        { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 20, type: 'readInt32BE',  converter: ValueConverter},
    reactivePowerL1:{ value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 22, type: 'readInt32BE',  converter: ValueConverter},
    apparentPowerL1:{ value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 24, type: 'readInt32BE',  converter: ValueConverter},
    voltageUnbalanceL1:{value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 26, type: 'readUInt16BE', converter: ValueConverter},
    currentUnbalanceL1:{value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 27, type: 'readUInt16BE', converter: ValueConverter},
    phaseL1:        { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 28, type: 'readUInt16BE', converter: ValueConverter},
    powerFactorL1:  { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 29, type: 'readInt16BE',  converter: ValueConverter},
    powerTHDL1:     { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 30, type: 'readUInt16BE', converter: ValueConverter},
    voltageL2:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 32, type: 'readUInt32BE', converter: ValueConverter},
    currentL2:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 34, type: 'readUInt32BE', converter: ValueConverter},
    powerL2:        { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 36, type: 'readInt32BE',  converter: ValueConverter},
    reactivePowerL2:{ value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 38, type: 'readInt32BE',  converter: ValueConverter},
    apparentPowerL2:{ value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 40, type: 'readInt32BE',  converter: ValueConverter},
    voltageUnbalanceL2:{value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 42, type: 'readUInt16BE', converter: ValueConverter},
    currentUnbalanceL2:{value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 43, type: 'readUInt16BE', converter: ValueConverter},
    phaseL2:        { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 44, type: 'readUInt16BE', converter: ValueConverter},
    powerFactorL2:  { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 45, type: 'readInt16BE',  converter: ValueConverter},
    powerTHDL2:     { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 46, type: 'readUInt16BE', converter: ValueConverter},
    voltageL3:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 48, type: 'readUInt32BE', converter: ValueConverter},
    currentL3:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 50, type: 'readUInt32BE', converter: ValueConverter},
    powerL3:        { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 52, type: 'readInt32BE',  converter: ValueConverter},
    reactivePowerL3:{ value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 54, type: 'readInt32BE',  converter: ValueConverter},
    apparentPowerL3:{ value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 56, type: 'readInt32BE',  converter: ValueConverter},
    voltageUnbalanceL3:{value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 58, type: 'readUInt16BE', converter: ValueConverter},
    currentUnbalanceL3:{value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 59, type: 'readUInt16BE', converter: ValueConverter},
    phaseL3:        { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 60, type: 'readUInt16BE', converter: ValueConverter},
    powerFactorL3:  { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 61, type: 'readInt16BE',  converter: ValueConverter},
    powerTHDL3:     { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 62, type: 'readUInt16BE', converter: ValueConverter},

    demandCurrentL1:        { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 0, type: 'readUInt32BE', converter: undefined},
    demandMaxCurrentL1:     { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 2, type: 'readUInt32BE', converter: undefined},
    demandPowerL1:          { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 4, type: 'readInt32BE', converter: undefined},
    demandMaxPowerL1:       { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 6, type: 'readInt32BE', converter: undefined},
    demandCurrentL2:        { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 8, type: 'readUInt32BE', converter: undefined},
    demandMaxCurrentL2:     { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 10, type: 'readUInt32BE', converter: undefined},
    demandPowerL2:          { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 12, type: 'readInt32BE', converter: undefined},
    demandMaxPowerL2:       { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 14, type: 'readInt32BE', converter: undefined},
    demandCurrentL3:        { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 16, type: 'readUInt32BE', converter: undefined},
    demandMaxCurrentL3:     { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 18, type: 'readUInt32BE', converter: undefined},
    demandPowerL3:          { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 20, type: 'readInt32BE', converter: undefined},
    demandMaxPowerL3:       { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 22, type: 'readInt32BE', converter: undefined},
    demandCurrent:          { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 24, type: 'readUInt32BE', converter: undefined},
    demandMaxCurrent:       { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 26, type: 'readUInt32BE', converter: undefined},
    demandPower:            { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 28, type: 'readInt32BE', converter: undefined},
    demandMaxPower:         { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 30, type: 'readInt32BE', converter: undefined},
    demandPredictionPower:  { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 32, type: 'readUInt32BE', converter: undefined},

    energy:                 { value: undefined, values: [], registered: false, address: 38000 + (id - 1) * 18,      type: 'readUInt32BE', converter: EnergyConverter},
    thisMonthEnergy:        { value: undefined, values: [], registered: false, address: 38000 + (id - 1) * 18 + 2,  type: 'readUInt32BE', converter: EnergyConverter},
    lastMonthEnergy:        { value: undefined, values: [], registered: false, address: 38000 + (id - 1) * 18 + 4,  type: 'readUInt32BE', converter: EnergyConverter},
    reactiveEnergy:         { value: undefined, values: [], registered: false, address: 38000 + (id - 1) * 18 + 6,  type: 'readUInt32BE', converter: EnergyConverter},
    thisMonthReactiveEnergy:{ value: undefined, values: [], registered: false, address: 38000 + (id - 1) * 18 + 8,  type: 'readUInt32BE', converter: EnergyConverter},
    lastMonthReactiveEnergy:{ value: undefined, values: [], registered: false, address: 38000 + (id - 1) * 18 + 10, type: 'readUInt32BE', converter: EnergyConverter},
    apparentEnergy:         { value: undefined, values: [], registered: false, address: 38000 + (id - 1) * 18 + 12, type: 'readUInt32BE', converter: EnergyConverter},
    thisMonthApparentEnergy:{ value: undefined, values: [], registered: false, address: 38000 + (id - 1) * 18 + 14, type: 'readUInt32BE', converter: EnergyConverter},
    lastMonthApparentEnergy:{ value: undefined, values: [], registered: false, address: 38000 + (id - 1) * 18 + 16, type: 'readUInt32BE', converter: EnergyConverter}
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

    setValue(self.items.type);
    setValue(self.items.leakageCurrent);
    setValue(self.items.current);
    setValue(self.items.power);
    setValue(self.items.reactivePower);
    setValue(self.items.apparentPower);
    setValue(self.items.PFAverage);
    setValue(self.items.currentUnbalance);
    setValue(self.items.THDAverage);
    setValue(self.items.voltageL1);
    setValue(self.items.currentL1);
    setValue(self.items.powerL1);
    setValue(self.items.reactivePowerL1);
    setValue(self.items.apparentPowerL1);
    setValue(self.items.voltageUnbalanceL1);
    setValue(self.items.currentUnbalanceL1);
    setValue(self.items.phaseL1);
    setValue(self.items.powerFactorL1);
    setValue(self.items.powerTHDL1);
    setValue(self.items.voltageL2);
    setValue(self.items.currentL2);
    setValue(self.items.powerL2);
    setValue(self.items.reactivePowerL2);
    setValue(self.items.apparentPowerL2);
    setValue(self.items.voltageUnbalanceL2);
    setValue(self.items.currentUnbalanceL2);
    setValue(self.items.phaseL2);
    setValue(self.items.powerFactorL2);
    setValue(self.items.powerTHDL2);
    setValue(self.items.voltageL3);
    setValue(self.items.currentL3);
    setValue(self.items.powerL3);
    setValue(self.items.reactivePowerL3);
    setValue(self.items.apparentPowerL3);
    setValue(self.items.voltageUnbalanceL3);
    setValue(self.items.currentUnbalanceL3);
    setValue(self.items.phaseL3);
    setValue(self.items.powerFactorL3);
    setValue(self.items.powerTHDL3);

    setValue(self.items.energy);
    setValue(self.items.thisMonthEnergy);
    setValue(self.items.lastMonthEnergy);
    setValue(self.items.reactiveEnergy);
    setValue(self.items.thisMonthReactiveEnergy);
    setValue(self.items.lastMonthReactiveEnergy);
    setValue(self.items.apparentEnergy);
    setValue(self.items.thisMonthApparentEnergy);
    setValue(self.items.lastMonthApparentEnergy);

    setValue(self.items.demandCurrentL1);
    setValue(self.items.demandMaxCurrentL1);
    setValue(self.items.demandPowerL1);
    setValue(self.items.demandMaxPowerL1);
    setValue(self.items.demandCurrentL2);
    setValue(self.items.demandMaxCurrentL2);
    setValue(self.items.demandPowerL2);
    setValue(self.items.demandMaxPowerL2);
    setValue(self.items.demandCurrentL3);
    setValue(self.items.demandMaxCurrentL3);
    setValue(self.items.demandPowerL3);
    setValue(self.items.demandMaxPowerL3);
    setValue(self.items.demandCurrent);
    setValue(self.items.demandMaxCurrent);
    setValue(self.items.demandPower);
    setValue(self.items.demandMaxPower);
    setValue(self.items.demandPredictionPower);
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

  if (self.items[sensor.field] != undefined) {
    self.items[sensor.field].registered = true;
    self.parent.run();
  }
  else{
    logger.error('Undefined feeder field tried to register : ', sensor.field);
    logger.error(self.items);
  }
}

Gems35xxFeeder.prototype.getValue = function (sensor) {
  var self = this;

  if (self.items[sensor.field] != undefined) {
    return  self.items[sensor.field].value;
  }

  logger.error('Tried to get value of undefined feeder field : ', sensor.field);
  return  undefined;
}

Gems35xxFeeder.prototype.getValues = function (sensor) {
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
  create: Gems35xxFeederCreate
};