'use strict';

var util = require('util');
var sensorDriver = require('../../index');
var Network = sensorDriver.Network;
var Sensor = sensorDriver.Sensor;

function Gems35xxModbusTCP(options) {
  Network.call(this, 'gems35xx-modbus-tcp', options);
}

util.inherits(Gems35xxModbusTCP, Network);

Gems35xxModbusTCP.prototype.discover = function(networkName, options, cb) {
  return cb && cb(new Error('Not supported'));
};

module.exports = new Gems35xxModbusTCP();
