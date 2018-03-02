'use strict';

var net = require('net');
var util = require('util');
var _ = require('lodash');
var async = require('async');
var modbus = require('modbus-tcp');
var EventEmitter = require('events').EventEmitter;

var logger = require('./index').Sensor.getLogger('Sensor');

var MODBUS_UNIT_ID = 1;
var RETRY_OPEN_INTERVAL = 3000; // 3sec
var GEMS35XX_REGISTER_UPDATE_INTERVAL = 10000;

var gems35xxList = [];

// client: modbus client
// registerAddress: register address from 40000
// bufferReadFunc: read function name of Buffer object
// cb: function (err, value)
function readValue(task, done) {
  var client = task.client;
  var cb = task.readCb;
  var from = task.registerAddress - 30000;
  var to = from + task.registerCount;

  logger.debug('readValue() registerAddress:', task.registerAddress);
  client.readInputRegisters(MODBUS_UNIT_ID, from, to, function readCb(err, data) {
    var buffer = new Buffer(4);
    var value;
    var badDataErr;

    if (err) {
      logger.error('modbus-tcp.readHoldingRegisters() Error:', err);

      if (cb) {
        cb(err);
      }

      return done && done(err);
    }

    if (data.length < 2 || !Buffer.isBuffer(data[0]) || !Buffer.isBuffer(data[1])) {
      logger.error('modbus-tcp.readHoldingRegisters() Error: bad data format');
      badDataErr = new Error('Bad data:', data);

      if (cb) {
        cb(badDataErr);
      }

      return done && done(badDataErr);
    }

    if (cb) {
      cb(null, task.registerAddress, task.registerCount, data);
    }

    return done && done();
  });
}

function Gems35xx (address, port) {
  var self = this;

  self.interval = GEMS35XX_REGISTER_UPDATE_INTERVAL;
  self.intervalHandler = undefined;
  self.address = address;
  self.port    = port;
  self.children = [];
  self.queue = async.queue(readValue);
  self.queue.drain = function () {
    logger.debug('All the tasks have been done.');
  };

  self.isRun = false;

  EventEmitter.call(self);
}

util.inherits(Gems35xx, EventEmitter);

function  Gems35xxCreate(address, port) {
  var gems35xx;

  gems35xx = Gems35xxGet(address, port);
  if (gems35xx == undefined) {
    gems35xx = new Gems35xx(address, port) ;
    gems35xxList.push(gems35xx);

    logger.debug('Trying connection:', address);
    gems35xx.client = new modbus.Client();
    gems35xx.socket = net.connect(port, address, function onConnect() {
      logger.debug('Connected:', address);
    });

    gems35xx.client.writer().pipe(gems35xx.socket);
    gems35xx.socket.pipe(gems35xx.client.reader());

    gems35xx.socket.on('close', function onClose() {
      gems35xx.socket = undefined;
      gems35xx.client = undefined;

      gems35xx.queue.kill();

      logger.error('Modbus-tcp connection closed: (%s:%s)', address, port);
    });

    gems35xx.socket.on('error', function onError(err) {
      gems35xx.socket = undefined;
      gems35xx.client = undefined;

      gems35xx.queue.kill();

      logger.error('Modbus-tcp connection error:', err);
    });
  }

  return  gems35xx;
}

function  Gems35xxGet(address, port) {
  var i;
  var gems35xx;

  for(i = 0 ; i < gems35xxList.length ; i++) {
    if ((gems35xxList[i].address == address) && (gems35xxList[i].port == port)) {
      return  gems35xxList[i];
    }
  }

  return  undefined;
}

Gems35xx.prototype.addChild = function(child) {
  var self = this;

  self.children.push(child);
}

Gems35xx.prototype.getChild = function (id) {
  var self = this;
  var i;

  for (i = 0; i < self.children.length; i++) {
    if (self.children[i].feedId == id) {
      return self.children[i];
    }
  }

  return  undefined;
}

Gems35xx.prototype.run = function() {
  var self = this;

  if (self.intervalHandler != undefined) {
    return;
  }

  self.intervalHandler = setInterval(function() {
    self.children.map(function(child){
      var i;

      for(i = 0 ; i < child.addressSet.length ; i++) {
        var callArgs = {
          client: self.client,
          registerAddress: child.addressSet[i].address,
          registerCount: child.addressSet[i].count,
          readCb: function (err, address, count, registers) {
            if (err == undefined) {
              child.emit('done', address, count, registers)
            }
          }
        };

        self.queue.push(callArgs, function pushCb(err) {
          if (err) {
            logger.error('pushCB error: ', err);
          }
        });
      }
    });
  }, self.interval);

  self.isRun = true;
}

Gems35xx.prototype.getValue = function (id, field) {
  var self = this;

  if (field == undefined) {
    field = id;
    id = 0;
  }

  if (id != 0) {
    var feeder = self.getChild(id);
    if (feeder != undefined) {
      return  feeder.getValue(field);
    }
    else {
      return  undefined;
    }
  }

  var i;
  for(i = 0 ; i < self.items.length ; i++) {
    if (self.items[i].field == field) {
      return  self.items[i].value;
    }
  }

  return  undefined;
}

module.exports = {
  create: Gems35xxCreate,
  get:  Gems35xxGet
};
