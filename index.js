let snmp = require("net-snmp");

module.exports = (api) => {
    api.registerAccessory('ups', UPS);
};


class UPS {
    services = []

    getServices() {
        return this.services;
    }

    configureAccessory(accessory) {
        console.log(accessory)
    }

    constructor(log, config, api) {
        this.cachedInformations = {};
        this.cachedBatteryLevel = 0;
        this.cachedBatteryLevel = false;
        this.cachedLowBattery = 0;
        this.cachedTemperature = 0;
        this.updateInterval = 20000;
        this.outletGroupsSupported = false;
        this.envTemp1Supported = false;
        this.envTemp2Supported = false;
        this.envHum1Supported = false;
        this.envHum2Supported = false;

        this.log = log;
        this.config = config;
        this.api = api;
        this.session = snmp.createSession(this.config.address, this.config.community);
        this.oids = {
            "env_temp_1": ".1.3.6.1.4.1.318.1.1.2.1.1.0",
            "env_temp_2": ".1.3.6.1.4.1.318.1.1.2.1.3.0",
            "env_hum_1": ".1.3.6.1.4.1.318.1.1.2.1.2.0",
            "env_hum_2": ".1.3.6.1.4.1.318.1.1.2.1.4.0",
            "date_of_manufacture": "1.3.6.1.4.1.318.1.1.1.1.2.2.0",
            "name": "1.3.6.1.4.1.318.1.1.1.1.1.2.0",
            "model": "1.3.6.1.4.1.318.1.1.1.1.1.1.0",
            "serial_number": "1.3.6.1.4.1.318.1.1.1.1.2.3.0",
            "firmware_rev": "1.3.6.1.4.1.318.1.1.1.1.2.1.0",
            "out_volt": "1.3.6.1.4.1.318.1.1.1.4.2.1.0",
            "bat_capacity": "1.3.6.1.4.1.318.1.1.1.2.2.1.0",
            "bat_status": "1.3.6.1.4.1.318.1.1.1.2.1.1.0",
            "time_on_bat": "1.3.6.1.4.1.318.1.1.1.2.1.2.0",
            "alarm_state": "1.3.6.1.4.1.318.1.1.1.5.2.4.0",
            "self_test_state": "1.3.6.1.4.1.318.1.1.1.7.2.3.0",
            "temp": "1.3.6.1.4.1.318.1.1.1.2.2.2.0",
            "turn_on": {"oid": "1.3.6.1.4.1.318.1.1.1.6.2.6.0", "type": snmp.ObjectType.INTEGER, "value": 2},
            "turn_off": {"oid": "1.3.6.1.4.1.318.1.1.1.6.2.1.0", "type": snmp.ObjectType.INTEGER, "value": 2},
            "turn_off_graceful": {"oid": "1.3.6.1.4.1.318.1.1.1.6.2.1.0", "type": snmp.ObjectType.INTEGER, "value": 3},
            "alarm_on": {"oid": "1.3.6.1.4.1.318.1.1.1.5.2.4.0", "type": snmp.ObjectType.INTEGER, "value": 1},
            "alarm_off": {"oid": "1.3.6.1.4.1.318.1.1.1.5.2.4.0", "type": snmp.ObjectType.INTEGER, "value": 3},
            "start_self_test": {"oid": "1.3.6.1.4.1.318.1.1.1.7.2.2.0", "type": snmp.ObjectType.INTEGER, "value": 2}
        };

        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
        this.name = this.config.name;

        this.informationService = new this.Service.AccessoryInformation()
        this.informationService.setCharacteristic(this.Characteristic.Manufacturer, "APC");
        this.informationService.getCharacteristic(this.Characteristic.Name).onGet(
            this.getCachedAccessoryInformation.bind(this, this.oids.name, "Name")
        );
        this.informationService.getCharacteristic(this.Characteristic.Model).onGet(
            this.getCachedAccessoryInformation.bind(this, this.oids.model, "Model")
        );
        this.informationService.getCharacteristic(this.Characteristic.SerialNumber).onGet(
            this.getCachedAccessoryInformation.bind(this, this.oids.serial_number, "Serial Number")
        );
        this.informationService.getCharacteristic(this.Characteristic.FirmwareRevision).onGet(
            this.getCachedAccessoryInformation.bind(this, this.oids.firmware_rev, "Firmware Rev.")
        );


        this.batteryService = new this.Service.BatteryService(this.name);
        this.batteryService.getCharacteristic(this.Characteristic.StatusLowBattery).onGet(
            this.getLowBatteryHandler.bind(this)
        );
        this.batteryService.getCharacteristic(this.Characteristic.BatteryLevel).onGet(
            this.getBatteryLevelHandler.bind(this)
        );
        this.batteryService.getCharacteristic(this.Characteristic.ChargingState).onGet(
            this.getBatteryChargingStateHandler.bind(this)
        );

        this.switchService = new this.Service.Switch(this.name);
        this.switchService.getCharacteristic(this.Characteristic.On).onGet(
            this.getPowerStateHandler.bind(this)
        ).onSet(
            this.setPowerStateHandler.bind(this)
        );

        this.gracefulSwitchService = new this.Service.Switch(this.name + " (Graceful)", "Graceful");
        this.gracefulSwitchService.getCharacteristic(this.Characteristic.On).onGet(
            this.getPowerStateHandler.bind(this)
        ).onSet(
            this.setGracefulPowerStateHandler.bind(this)
        );

        this.alarmSwitchService = new this.Service.Switch(this.name + " Alarm", "Alarm");
        this.alarmSwitchService.getCharacteristic(this.Characteristic.On).onGet(
            this.getAlarmStateHandler.bind(this)
        ).onSet(
            this.setAlarmStateHandler.bind(this)
        );

        this.selfTestSwitchService = new this.Service.Switch(this.name + " Self-Test", "Self-Test");
        this.selfTestSwitchService.getCharacteristic(this.Characteristic.On).onGet(
            this.getSelfTestHandler.bind(this)
        ).onSet(
            this.setSelfTestHandler.bind(this)
        );

        this.tempService = new this.Service.TemperatureSensor(this.name + " Battery");
        this.tempService.getCharacteristic(this.Characteristic.CurrentTemperature).onGet(
            this.getTempHandler.bind(this)
        );

        this.services.push(this.informationService);
        if (this.config.enable_non_graceful || this.config.enable_non_graceful === undefined) {
            this.services.push(this.switchService);
        }
        if (this.config.enable_graceful || this.config.enable_graceful === undefined) {
            this.services.push(this.gracefulSwitchService)
        }
        if (this.config.enable_alarm || this.config.enable_alarm === undefined) {
            this.services.push(this.alarmSwitchService)
        }
        if (this.config.enable_self_test || this.config.enable_self_test === undefined) {
            this.services.push(this.selfTestSwitchService)
        }
        if (this.config.enable_temp || this.config.enable_temp === undefined) {
            this.services.push(this.tempService)
        }
        if (this.config.enable_battery || this.config.enable_battery === undefined) {
            this.services.push(this.batteryService)
        }

        let configUpdateInterval = this.config.update_interval;
        if (configUpdateInterval !== undefined) {
            if (Number.isInteger(configUpdateInterval)) {
                if (configUpdateInterval < 5) {
                    this.log.error("Minimum update interval value is 5 seconds!");
                } else {
                    this.updateInterval = configUpdateInterval * 1000;
                }
            } else {
                this.log.error("Update interval is not a number!");
            }

        }

        this.getInitialAccessoryInformation();
        this.updateLoop();
    }

    async getInitialAccessoryInformation() {
        await this.getCachedAccessoryInformation(this.oids.name, "Name");
        await this.getCachedAccessoryInformation(this.oids.model, "Model");
        await this.getCachedAccessoryInformation(this.oids.serial_number, "Serial Number");
        await this.getCachedAccessoryInformation(this.oids.firmware_rev, "Firmware Rev.");
        await this.getCachedAccessoryInformation(this.oids.date_of_manufacture, "Date Of Manufacture");

        await this.getSNMP(this.oids.env_temp_1) !== null ? this.envTemp1Supported = true : null;
        await this.getSNMP(this.oids.env_temp_2) !== null ? this.envTemp2Supported = true : null;
        await this.getSNMP(this.oids.env_hum_1) !== null ? this.envHum1Supported = true : null;
        await this.getSNMP(this.oids.env_hum_2) !== null ? this.envHum2Supported = true : null;
    }

    // Helper

    async updateLoop() {
        setInterval(function () {
            this.update()
        }.bind(this), this.updateInterval)
    };

    async update() {
        this.log.debug("Updating values...")
        this.tempService.getCharacteristic(this.Characteristic.CurrentTemperature).updateValue(
            await this.getTempHandler()
        );
        this.batteryService.getCharacteristic(this.Characteristic.StatusLowBattery).updateValue(
            await this.getLowBatteryHandler()
        );
        this.batteryService.getCharacteristic(this.Characteristic.BatteryLevel).updateValue(
            await this.getBatteryLevelHandler()
        );
        this.batteryService.getCharacteristic(this.Characteristic.ChargingState).updateValue(
            await this.getBatteryChargingStateHandler()
        );
    }

    setSNMP(oid, type, value) {
        let logging = this.log;
        this.session.set([{oid, type, value}], function (error, varbinds) {
            if (error) {
                logging.debug(error.toString());
                return null;
            }
            for (let i = 0; i < varbinds.length; i++) {
                if (snmp.isVarbindError(varbinds[i])) {
                    logging.debug(snmp.varbindError(varbinds[i]));
                } else {
                    logging.debug("Set " + varbinds[i].oid + " to value " + varbinds[i].value);
                }
            }
        });
    }

    async getSNMP(oid) {
        let logging = this.log;
        let session = this.session;
        let timeoutPromise = new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error('timeout'));
            }, 1800);
        });

        let snmpPromise = new Promise(function (resolve, reject) {
            try {
                session.get([oid], function (error, varbinds) {
                    if (error) {
                        logging.debug(error);
                        reject(error.toString());
                    } else if (snmp.isVarbindError(varbinds[0])) {
                        logging.debug(snmp.varbindError(varbinds[0]));
                        reject(snmp.varbindError(varbinds[0]).toString());
                    } else {
                        logging.debug("Got " + oid + " value " + varbinds[0].value);
                        resolve(varbinds[0].value.toString());
                    }
                })
            } catch (RequestFailedError) {
                logging.warn("Device not reachable or operation not supported")
            }
        });

        return Promise.race([snmpPromise, timeoutPromise])
            .then(result => {
                return result;
            })
            .catch(error => {
                return null;
            });
    }

    // Self-Test

    async getSelfTestHandler() {
        this.log.debug('Triggered GET setSelfTestHandler');
        return await this.getSNMP(this.oids.self_test_state) > 3;
    }

    async setSelfTestHandler(value) {
        this.log.debug('Triggered SET setSelfTestHandler');
        this.log.info('Starting UPS self-test...')
        this.log.info('After the self-test is completed, the UPS will be unavailable for a few seconds.')
        value ? this.setSNMP(
            this.oids.start_self_test.oid,
            this.oids.start_self_test.type,
            this.oids.start_self_test.value
        ) : null;
    }

    // Power

    async getPowerStateHandler() {
        this.log.debug('Triggered GET getPowerStateHandler');
        return await this.getSNMP(this.oids.out_volt) >= 10;
    }

    async setPowerStateHandler(value) {
        this.log.debug('Triggered SET setPowerStateHandler');
        let cmd = value ? this.oids.turn_on : this.oids.turn_off;
        this.setSNMP(cmd.oid, cmd.type, cmd.value);
    }

    async setGracefulPowerStateHandler(value) {
        this.log.debug('Triggered SET setGracefulPowerStateHandler');
        let cmd = value ? this.oids.turn_on : this.oids.turn_off_graceful;
        this.setSNMP(cmd.oid, cmd.type, cmd.value);
    }

    // Alarm

    async getAlarmStateHandler() {
        this.log.debug('Triggered GET getAlarmStateHandler');
        return await this.getSNMP(this.oids.alarm_state) <= 2;
    }

    async setAlarmStateHandler(value) {
        this.log.debug('Triggered SET setAlarmStateHandler');
        let cmd = value ? this.oids.alarm_on : this.oids.alarm_off;
        this.setSNMP(cmd.oid, cmd.type, cmd.value);
    }

    // Temp

    async getTempHandler() {
        this.log.debug('Triggered GET getTempHandler')
        let temp = await this.getSNMP(this.oids.temp);
        temp ? this.cachedTemperature = temp : null;
        return temp ? temp : this.cachedTemperature;
    }

    // Battery

    async getBatteryLevelHandler() {
        this.log.debug('Triggered GET getBatteryLevelHandler');
        let level = await this.getSNMP(this.oids.bat_capacity);
        level ? this.cachedBatteryLevel = level : null;
        return level ? level : this.cachedBatteryLevel;
    }

    async getLowBatteryHandler() {
        this.log.debug('Triggered GET getLowBatteryHandler');
        let status = await this.getSNMP(this.oids.bat_status);
        if (status === null) {
            return this.cachedLowBattery;
        }
        status ? this.cachedLowBattery = status === 3 : null;
        return status === 3 ? 1 : 0;
    }


    async getBatteryChargingStateHandler() {
        this.log.debug('Triggered GET getBatteryChargingStateHandler');
        let charging = await this.getSNMP(this.oids.time_on_bat);
        if (charging === null) {
            return this.cachedBatteryLevel;
        }
        charging ? this.cachedBatteryLevel = charging : null;
        return charging === "0" ? 1 : 0;
    }

    async getCachedAccessoryInformation(oid, log_text) {
        if (!this.cachedInformations.hasOwnProperty(oid)) {
            this.cachedInformations[oid] = null;
        }

        let val = await this.getSNMP(oid);
        if (val) {
            this.cachedInformations[oid] === null ? this.log.info(log_text + ": " + val) : null;
            this.cachedInformations[oid] = val;
            return val;
        }

        if (this.cachedInformations[oid] === null) {
            return "Unknown";
        }

        return this.cachedInformations[oid];
    }
}