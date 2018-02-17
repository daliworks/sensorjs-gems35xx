'use strict';

var logger = require('log4js').getLogger('Sensor');

function initDrivers() {
  var gems35xxSensor;

  try {
    gems35xxSensor = require('./driver/gems35xxSensor');
  } catch(e) {
    logger.error('Cannot load ./driver/gems35xxSensor', e);
  }

  return {
    gems35xxSensor: gems35xxSensor
  };
}

function initNetworks() {
  var modbusTcpNteksys;

  try {
    modbusTcpNteksys = require('./network/modbus-tcp-gems35xx');
  } catch (e) {
    logger.error('Cannot load ./network/modbus-tcp-gems35xx', e);
  }

  return {
    'modbus-tcp-gems35xx': modbusTcpNteksys
  };
}

module.exports = {
  networks: ['modbus-tcp-gems35xx'],
  drivers: {
    gems35xxSensor: [
      'gems35xxVoltage',
      'gems35xxCurrent',
      'gems35xxCurrentMilli',
      'gems35xxImbalance',
      'gems35xxTimeDuration',
      'gems35xxElectricEnergy',
      'gems35xxElectricActivePower',
      'gems35xxElectricReactivePower',
      'gems35xxFrequency',
      'gems35xxPowerFactor',
      'gems35xxCount'
    ]
  },
  initNetworks: initNetworks,
  initDrivers: initDrivers
};
