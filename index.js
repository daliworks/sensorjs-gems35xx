var logger = require('log4js').getLogger('Sensor');

function initDrivers() {
  var gems35xxBaseActuator;
  var gems35xxBaseSensor;
  var gems35xxFeederSensor;
  var gems3512FeederSensor;

  try {
    gems35xxBaseActuator = require('./driver/gems35xxBaseActuator');
  } catch (e) {
    logger.error('Cannot load ./driver/gems35xxBaseActuator', e);
  }

  try {
    gems35xxBaseSensor = require('./driver/gems35xxBaseSensor');
  } catch (e) {
    logger.error('Cannot load ./driver/gems35xxBaseSensor', e);
  }

  try {
    gems35xxFeederSensor = require('./driver/gems35xxFeederSensor');
  } catch (e) {
    logger.error('Cannot load ./driver/gems35xxFeederSensor', e);
  }

  try {
    gems3512FeederSensor = require('./driver/gems3512FeederSensor');
  } catch (e) {
    logger.error('Cannot load ./driver/gems3512FeederSensor', e);
  }

  return {
    gems35xxBaseActuator: gems35xxBaseActuator,
    gems35xxBaseSensor: gems35xxBaseSensor,
    gems35xxFeederSensor: gems35xxFeederSensor,
    gems3512FeederSensor: gems3512FeederSensor
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
    gems35xxBaseActuator: [
      'gems35xxDemandReset'
    ],
    gems35xxBaseSensor: [
      'gems35xxBaseTemperature',
      'gems35xxBaseFrequency',
      'gems35xxBaseVoltage',
      'gems35xxBaseVoltageUnbalance'
    ],
    gems35xxFeederSensor: [
      'gems35xxFeederType',
      'gems35xxVoltage',
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
      'gems35xxVoltageUnbalance',
      'gems35xxTHDAverage',
      'gems35xxPowerTHD',
      'gems35xxPhase',
      'gems35xxDemandCurrent',
      'gems35xxDemandMaxCurrent',
      'gems35xxDemandPower',
      'gems35xxDemandMaxPower',
      'gems35xxDemandPredictionPower'
    ],
    gems3512FeederSensor: [
      'gems3512FeederType',
      'gems3512LeakageCurrent',
      'gems3512LeakageCurrentOver',
      'gems3512LeakageCurrentAlarm'
    ]
  },
  initNetworks: initNetworks,
  initDrivers: initDrivers
};
