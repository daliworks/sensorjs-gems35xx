'use strict';

var util = require('util');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var Gems35xx = require('./gems35xx');
var logger = require('./index').Sensor.getLogger('Sensor');

function scaleConverter(value, scale) {
  if (scale) {
    return value * scale;
  }

  return value;
}

function scaleConverter3(value, scale) {
  if (scale) {
    value = value * scale;
  }

  if (value >= 10) {
    return 1;
  }

  return 0;
}

function Gems3512Feeder(parent, id) {
  var self = this;

  EventEmitter.call(self);

  self.feedId = id;
  self.parent = parent;
  self.run = false;
  self.interval = 10000;
  self.addressSet = [{
    address: 39012 + (id - 1) * 18,
    count: 18
  }];
  self.items = {
    leakageCurrent: {
      value: undefined,
      time: undefined,
      values: [],
      sensor: undefined,
      event: true,
      registered: false,
      address: 39012 + (id - 1) * 18 + 2,
      type: 'readUInt32BE',
      converter: scaleConverter,
      scale: 0.01
    },
    leakageCurrentOver: {
      value: undefined,
      time: undefined,
      values: [],
      sensor: undefined,
      event: true,
      registered: false,
      address: 39012 + (id - 1) * 18 + 2,
      type: 'readUInt32BE',
      converter: scaleConverter,
      scale: 0.01
    },
    leakageCurrentAlarm: {
      value: undefined,
      time: undefined,
      values: [],
      sensor: undefined,
      event: true,
      registered: false,
      address: 39012 + (id - 1) * 18 + 2,
      type: 'readUInt32BE',
      converter: scaleConverter3,
      scale: 0.01
    },
    leakageCurrentIGR: {
      value: undefined,
      time: undefined,
      values: [],
      sensor: undefined,
      event: true,
      registered: false,
      address: 39012 + (id - 1) * 18 + 4,
      type: 'readInt32BE',
      converter: scaleConverter,
      scale: 0.1
    },
    leakageCurrentIGC: {
      value: undefined,
      time: undefined,
      values: [],
      sensor: undefined,
      event: true,
      registered: false,
      address: 39012 + (id - 1) * 18 + 6,
      type: 'readInt32BE',
      converter: scaleConverter,
      scale: 0.1
    }
  };

  _.each(self.items, function(item, name) {
    item.name = name;
  });

  self.on('done', function (startAddress, count, registers) {
    function setValue(item) {
      if (item.sensor) {
        if (startAddress <= item.address && item.address < startAddress + count * 2) {
          var buffer = new Buffer(4);
  
          registers[item.address - startAddress].copy(buffer, 0);
          registers[item.address - startAddress + 1].copy(buffer, 2);
  
          if (item.converter) {
            item.value = item.converter((buffer[item.type](0) || 0), item.scale);
          } else {
            item.value = (buffer[item.type](0) || 0);
          }
          logger.trace('value :', buffer[item.type](0), item.value);
  
          if (item.values.length > 100) {
            item.values.shift();
          }
  
          item.values.push({
            value: item.value,
            time: _.now()
          });
  
          var data = {value: item.value};
          logger.trace('self.emit(', item.name, JSON.stringify(data), ')');
          self.emit(item.name, data);
        }
        else {
          logger.error('Out of range : ', startAddress, item.address, startAddress + count * 2);
        }
      }
    }

    setValue(self.items.leakageCurrent);
    setValue(self.items.leakageCurrentOver);
    setValue(self.items.leakageCurrentAlarm);
    setValue(self.items.leakageCurrentIGC);
    setValue(self.items.leakageCurrentIGR);
  });
}

util.inherits(Gems3512Feeder, EventEmitter);

function Gems3512FeederCreate(address, port, id) {
  var gems35xx = Gems35xx.create(address, port);

  var gems3512Feeder = gems35xx.getChild(id);
  if (!gems3512Feeder) {
    gems3512Feeder = new Gems3512Feeder(gems35xx, id);
    gems35xx.addChild(gems3512Feeder);
  }

  return gems3512Feeder;
}

Gems3512Feeder.prototype.registerField = function (sensor) {
  var self = this;

  if (self.items[sensor.field]) {
    self.items[sensor.field].sensor = sensor;
    self.items[sensor.field].registered = true;
    self.parent.start();
  } else {
    logger.error('Undefined feeder field tried to register : ', sensor.field);
    logger.error(self.items);
  }
};

Gems3512Feeder.prototype.getValue = function (sensor) {
  var self = this;

  if (self.items[sensor.field]) {
    return self.items[sensor.field].value;
  }

  logger.error('Tried to get value of undefined feeder field : ', sensor.field);
  return undefined;
};

Gems3512Feeder.prototype.getValues = function (sensor) {
  var self = this;
  var values = [];

  if (self.items[sensor.field]) {
    values = self.items[sensor.field].values;
    self.items[sensor.field].values = [];
    return values;
  }

  logger.error('Tried to get value of undefined feeder field : ', sensor.field);
  return undefined;
};

module.exports = {
  create: Gems3512FeederCreate
};