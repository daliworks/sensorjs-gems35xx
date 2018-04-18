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

function  leakageCurrentConverter(value) {
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
    pFAverage:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 10, type: 'readInt16BE',  converter: ValueConverter},
    currentUnbalance:{value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 12, type: 'readUInt16BE', converter: ValueConverter},
    tHDAverage:     { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 13, type: 'readUInt16BE', converter: ValueConverter},
    lGCLeakageCurrent:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 14, type: 'readInt32BE', converter: leakageCurrentConverter},
    lGRLeakageCurrent:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 15, type: 'readInt32BE', converter: leakageCurrentConverter},
    l1Vvoltage:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 16, type: 'readUInt32BE', converter: ValueConverter},
    l1Current:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 18, type: 'readUInt32BE', converter: ValueConverter},
    l1Ppower:        { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 20, type: 'readInt32BE',  converter: ValueConverter},
    l1ReactivePower:{ value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 22, type: 'readInt32BE',  converter: ValueConverter},
    l1ApparentPower:{ value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 24, type: 'readInt32BE',  converter: ValueConverter},
    l1VoltageUnbalance:{value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 26, type: 'readUInt16BE', converter: ValueConverter},
    l1CurrentUnbalance:{value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 27, type: 'readUInt16BE', converter: ValueConverter},
    l1Phase:        { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 28, type: 'readUInt16BE', converter: ValueConverter},
    l1PowerFactor:  { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 29, type: 'readInt16BE',  converter: ValueConverter},
    l1PowerTHD:     { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 30, type: 'readUInt16BE', converter: ValueConverter},
    l2Voltage:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 32, type: 'readUInt32BE', converter: ValueConverter},
    l2Current:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 34, type: 'readUInt32BE', converter: ValueConverter},
    l2Power:        { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 36, type: 'readInt32BE',  converter: ValueConverter},
    l2ReactivePower:{ value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 38, type: 'readInt32BE',  converter: ValueConverter},
    l2ApparentPower:{ value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 40, type: 'readInt32BE',  converter: ValueConverter},
    l2VoltageUnbalance:{value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 42, type: 'readUInt16BE', converter: ValueConverter},
    l2CurrentUnbalance:{value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 43, type: 'readUInt16BE', converter: ValueConverter},
    l2Phase:        { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 44, type: 'readUInt16BE', converter: ValueConverter},
    l2PowerFactor:  { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 45, type: 'readInt16BE',  converter: ValueConverter},
    l2PowerTHD:     { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 46, type: 'readUInt16BE', converter: ValueConverter},
    l3Voltage:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 48, type: 'readUInt32BE', converter: ValueConverter},
    l3Current:      { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 50, type: 'readUInt32BE', converter: ValueConverter},
    l3Power:        { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 52, type: 'readInt32BE',  converter: ValueConverter},
    l3ReactivePower:{ value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 54, type: 'readInt32BE',  converter: ValueConverter},
    l3ApparentPower:{ value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 56, type: 'readInt32BE',  converter: ValueConverter},
    l3VoltageUnbalance:{value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 58, type: 'readUInt16BE', converter: ValueConverter},
    l3CurrentUnbalance:{value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 59, type: 'readUInt16BE', converter: ValueConverter},
    l3Phase:        { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 60, type: 'readUInt16BE', converter: ValueConverter},
    l3PowerFactor:  { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 61, type: 'readInt16BE',  converter: ValueConverter},
    l3PowerTHD:     { value: undefined, values: [], registered: false, address: 32420 + (id - 1) * 64 + 62, type: 'readUInt16BE', converter: ValueConverter},

    l1DemandCurrent:        { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 0, type: 'readUInt32BE', converter: undefined},
    l1DemandMaxCurrent:     { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 2, type: 'readUInt32BE', converter: undefined},
    l1DemandPower:          { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 4, type: 'readInt32BE', converter: undefined},
    l1DemandMaxPower:       { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 6, type: 'readInt32BE', converter: undefined},
    l2DemandCurrent:        { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 8, type: 'readUInt32BE', converter: undefined},
    l2DemandMaxCurrent:     { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 10, type: 'readUInt32BE', converter: undefined},
    l2DemandPower:          { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 12, type: 'readInt32BE', converter: undefined},
    l2DemandMaxPower:       { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 14, type: 'readInt32BE', converter: undefined},
    l3DemandCurrent:        { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 16, type: 'readUInt32BE', converter: undefined},
    l3DemandMaxCurrent:     { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 18, type: 'readUInt32BE', converter: undefined},
    l3DemandPower:          { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 20, type: 'readInt32BE', converter: undefined},
    l3DemandMaxPower:       { value: undefined, values: [], registered: false, address: 36000 + (id - 1) * 34 + 22, type: 'readInt32BE', converter: undefined},
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
    setValue(self.items.pFAverage);
    setValue(self.items.currentUnbalance);
    setValue(self.items.tHDAverage);
    setValue(self.items.lGCLeakageCurrent);
    setValue(self.items.lGRLeakageCurrent);
    setValue(self.items.l1Voltage);
    setValue(self.items.l1Current);
    setValue(self.items.l1Power);
    setValue(self.items.l1ReactivePower);
    setValue(self.items.l1ApparentPower);
    setValue(self.items.l1VoltageUnbalance);
    setValue(self.items.l1CurrentUnbalance);
    setValue(self.items.l1Phase);
    setValue(self.items.l1PowerFactor);
    setValue(self.items.l1PowerTHD);
    setValue(self.items.l2Voltage);
    setValue(self.items.l2Current);
    setValue(self.items.l2Power);
    setValue(self.items.l2ReactivePower);
    setValue(self.items.l2ApparentPower);
    setValue(self.items.l2VoltageUnbalance);
    setValue(self.items.l2CurrentUnbalance);
    setValue(self.items.l2Phase);
    setValue(self.items.l2PowerFactor);
    setValue(self.items.l2PowerTHD);
    setValue(self.items.l3Voltage);
    setValue(self.items.l3Current);
    setValue(self.items.l3Power);
    setValue(self.items.l3ReactivePower);
    setValue(self.items.l3ApparentPower);
    setValue(self.items.l3VoltageUnbalance);
    setValue(self.items.l3CurrentUnbalance);
    setValue(self.items.l3Phase);
    setValue(self.items.l3PowerFactor);
    setValue(self.items.l3PowerTHD);

    setValue(self.items.energy);
    setValue(self.items.thisMonthEnergy);
    setValue(self.items.lastMonthEnergy);
    setValue(self.items.reactiveEnergy);
    setValue(self.items.thisMonthReactiveEnergy);
    setValue(self.items.lastMonthReactiveEnergy);
    setValue(self.items.apparentEnergy);
    setValue(self.items.thisMonthApparentEnergy);
    setValue(self.items.lastMonthApparentEnergy);

    setValue(self.items.l1DemandCurrent);
    setValue(self.items.l1DemandMaxCurrent);
    setValue(self.items.l1DemandPower);
    setValue(self.items.l1DemandMaxPower);
    setValue(self.items.l2DemandCurrent);
    setValue(self.items.l2DemandMaxCurrent);
    setValue(self.items.l2DemandPower);
    setValue(self.items.l2DemandMaxPower);
    setValue(self.items.l3DemandCurrent);
    setValue(self.items.l3DemandMaxCurrent);
    setValue(self.items.l3DemandPower);
    setValue(self.items.l3DemandMaxPower);
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