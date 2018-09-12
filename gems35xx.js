'use strict';

var _ = require('lodash');
var net = require('net');
var util = require('util');
var async = require('async');
var modbus = require('modbus-tcp');
var EventEmitter = require('events').EventEmitter;

var logger = require('./index').Sensor.getLogger('Sensor');
var CONFIG;

try {
  CONFIG = require('config');
} catch (e) {
  logger.warn('MODULES_NOT_SUPPORTED - config');
}

var MODBUS_UNIT_ID = 1;
var GEMS35XX_REGISTER_UPDATE_INTERVAL = 2000;

var gems35xxList = [];

// client: modbus client
// registerAddress: register address from 40000
// bufferReadFunc: read function name of Buffer object
// cb: function (err, value)
function readValue(task, done) {
  var client = task.client;
  var cb = task.readCb;
  var unitId = task.unitId;
  var from;
  var to;
  var readRegisters;

  if (30000 <= task.registerAddress && task.registerAddress <= 39999) {
    readRegisters = client.readInputRegisters;
    from = task.registerAddress - 30000;
    to = from + task.registerCount;
  } else if (40000 <= task.registerAddress && task.registerAddress <= 49999) {
    readRegisters = client.readHoldingRegisters;
    from = task.registerAddress - 40000;
    to = from + task.registerCount;
  } else {
    return done('Invalid address : ', task.registerAddress);
  }

  readRegisters(unitId, from, to, function readCb(err, data) {
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

// client: modbus client
// registerAddress: register address from 40000
// bufferReadFunc: read function name of Buffer object
// cb: function (err, value)
function writeValue(task, done) {
  var client = task.client;
  var cb = task.writeCb;
  var unitId = task.unitId;
  var from = task.registerAddress - 40000;
  var to = from + task.registerCount;
  var data = task.data;

  logger.debug('writeValue() registerAddress:', task.registerAddress);
  client.writeMultipleRegisters(unitId, from, to, data, function writeCb(err) {
    if (err) {
      logger.error('modbus-tcp.writeMultipleRegisters() Error:', err);

      if (cb) {
        cb(err);
      }

      return done && done(err);
    }

    if (cb) {
      cb(null, '{ status: \'on\', duration: 0 }');
    }

    return done && done();
  });
}


function Gems35xx(host, port) {
  var self = this;

  self.unitId = MODBUS_UNIT_ID; 
  self.interval = GEMS35XX_REGISTER_UPDATE_INTERVAL;
  self.host = host;
  self.port = port;
  self.children = [];
  self.connected = false;
  self.readQueue = async.queue(readValue);
  self.readQueue.drain = function () {
    logger.debug('All the read tasks have been done.');
  };
  self.writeQueue = async.queue(writeValue);
  self.writeQueue.drain = function () {
    logger.debug('All the write tasks have been done.');
  };

  EventEmitter.call(self);

  self.on('connect', function() {
    if (self.connectionTimeoutHandler) {
      clearTimeout(self.connectionTimeoutHandler);
      self.connectionTimeoutHandler = null;
    }
    self.connected = true;
    self.start();
  });

  self.on('disconnect', function() {
    if (self.connected) {
      self.stop();
      self.connected = false;
      self.connectionTimeoutHandler = setTimeout(function() {
        self.connect();
      }, 60000);
    }
  });

  self.client = new modbus.Client();
  self.socket = new net.Socket();

  self.client.writer().pipe(self.socket);
  self.socket.pipe(self.client.reader());

  self.socket.on('close', function() {
    self.readQueue.kill();
    self.writeQueue.kill();

    logger.error('Modbus-tcp connection closed: (%s:%s)', host, port);
    self.emit('disconnect');
  });

  self.socket.on('error', function(err) {
    self.readQueue.kill();
    self.writeQueue.kill();

    logger.error('Modbus-tcp connection error:', err);
    self.emit('disconnect');
  });
}

util.inherits(Gems35xx, EventEmitter);

Gems35xx.prototype.connect = function() {
  var self = this;

  if (!self.connected) {
    self.socket.connect({
      port: self.port,
      host: self.host
    }, function () {
      logger.debug('Connected:', self.host);
      self.emit('connect');
    });
  }
}

Gems35xx.prototype.addChild = function (child) {
  var self = this;

  self.children.push(child);
};

Gems35xx.prototype.getChild = function (id) {
  var self = this;
  var i;

  for (i = 0; i < self.children.length; i++) {
    if (self.children[i].feedId === id) {
      return self.children[i];
    }
  }

  return undefined;
};

Gems35xx.prototype.start = function () {
  var self = this;
  var time = new Date().getTime();

  if (!self.intervalHandler) {
    self.intervalHandler = setInterval(function () {
      if (self.client) {
/*
        var callArgs = {
          client: self.client,
          unitId : self.unitId,
          registerAddress: 40000,
          registerCount: 8,
          readCb: function (error, address, count, registers) {
            if (!error) {
              logger.error('Read time error');
            }

            
            var buffer = new Buffer(2);

            registers[0].copy(buffer, 0);
            var value = buffer['readUInt16BE'](0);
          } 
        };

        self.readQueue.push(callArgs, function(err) {
          if (err) {
            logger.error('pushCB error: ', err);
          }
        });
*/ 
        self.children.map(function (child) {
          function readDoneCB(err, address, count, registers) {
            if (!err) {
              child.emit('done', address, count, registers);
            }
          }

          function pushCB(err) {
            if (err) {
              logger.error('pushCB error: ', err);
            }
          }

          _.each(child.addressSet, function (set) {
            var callArgs = {
              client: self.client,
              unitId : self.unitId,
              registerAddress: set.address,
              registerCount: set.count,
              readCb: readDoneCB
            };

            self.readQueue.push(callArgs, pushCB);
          });
        });
      }
    }, self.interval);
  }
};

Gems35xx.prototype.stop = function () {
  var self = this;

  if (self.intervalHandler) {
    clearInterval(self.intervalHandler);
    self.intervalHandler = null;
  }
};

Gems35xx.prototype.getInterval = function() {
  var self = this;

  return  self.interval;
};

Gems35xx.prototype.setInterval = function(interval) {
  var self = this;

  if (self.interval !== parseInt(interval)) {
    self.interval = parseInt(interval);

    if (self.intervalHandler) {
      self.stop();
      self.start();
    }
  }
};

Gems35xx.prototype.getValue = function (id, field) {
  var self = this;

  if (!field) {
    field = id;
    id = 0;
  }

  if (id) {
    var feeder = self.getChild(id);
    if (feeder) {
      return feeder.getValue(field);
    } else {
      return undefined;
    }
  }

  var item = _.find(self.items, function(item){
    return  (item.field === field);
  });

  if (item) {
    return  item.value;
  }

  return undefined;
};

Gems35xx.prototype.setValue = function (address, count, registers, cb) {
  var self = this;

  if (self.client) {
    var callArgs = {
      client: self.client,
      unitId : self.unitId,
      registerAddress: address,
      registerCount: count,
      data: registers,
      writeCb: cb
    };

    self.writeQueue.push(callArgs, function pushCb(err) {
      if (err) {
        logger.error('pushCB error: ', err);
      }
    });
  } else {
    logger.debug('Client is undefined.');
  }
};


module.exports = {
  create: function (host, port) {
    var gems35xx;

    gems35xx = _.find(gems35xxList, function (item) {
      return ((item.host === host) && (item.port === port));
    });

    if (!gems35xx) {
      logger.debug('New GEMS35xx is created!');
      gems35xx = new Gems35xx(host, port);
      gems35xxList.push(gems35xx);

      logger.debug('Trying connection:', host);

      gems35xx.connect();
    }

    return gems35xx;
  },
  get: function (host, port) {
    return _.find(gems35xxList, function (gems35xx) {
      return ((gems35xx.host === host) && (gems35xx.port === port));
    });
  }
};
