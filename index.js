'use strict';

var logger = require('log4js').getLogger('Sensor');

function initDrivers() {
  var gems35xxBaseSensor;
  var gems35xxFeederSensor;

  try {
    gems35xxBaseSensor = require('./driver/gems35xxBaseSensor');
  } catch(e) {
    logger.error('Cannot load ./driver/gems35xxBaseSensor', e);
  }

  try {
    gems35xxFeederSensor = require('./driver/gems35xxFeederSensor');
  } catch(e) {
    logger.error('Cannot load ./driver/gems35xxFeederSensor', e);
  }

  return {
    gems35xxBaseSensor: gems35xxBaseSensor,
    gems35xxFeederSensor: gems35xxFeederSensor
  };
}

function initNetworks() {
  var network;

  try {
    network = require('./network/gems35xx-modbus-tcp');
  } catch (e) {
    logger.error('Cannot load ./network/gems35xx-modbus-tcp', e);
  }

  return {
    'gems35xx-base-modbus-tcp': network,
    'gems35xx-feeder-modbus-tcp': network
  };
}

module.exports = {
  networks: ['gems35xx-base-modbus-tcp', 'gems35xx-feeder-modbus-tcp'],
  drivers: {
    gems35xxBaseSensor: [
      'gems35xxTemperature',
      'gems35xxFrequency',
      'gems35xxVoltage',
      'gems35xxVoltageUnbalance'
    ],
    gems35xxFeederSensor: [
      'gems35xxFeederType',
      'gems35xxCurrent',
      'gems35xxPower',
      'gems35xxReactivePower',
      'gems35xxApparentPower',
      'gems35xxEnergy',
      'gems35xxReactiveEnergy',
      'gems35xxApparentEnergy',
      'gems35xxPowerFactor',
      'gems35xxLeakageCurrent',
      'gems35xxVAR',
      'gems35xxVA',
      'gems35xxPFAverage',
      'gems35xxCurrentUnbalance',
      'gems35xxTHDAverage',
      'gems35xxPowerTHD',
      'gems35xxPhase'
    ]
  },
  initNetworks: initNetworks,
  initDrivers: initDrivers
};

