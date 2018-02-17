'use strict';

var util = require('util');
var sensorDriver = require('../../index');
var Network = sensorDriver.Network;
var Sensor = sensorDriver.Sensor;

function ModbusTcpGems35xx(options) {
  Network.call(this, 'modbus-tcp-gems35xx', options);
}

util.inherits(ModbusTcpGems35xx, Network);

ModbusTcpGems35xx.prototype.discover = function(networkName, options, cb) {
  return cb && cb(new Error('Not supported'));
};

module.exports = new ModbusTcpGems35xx();
