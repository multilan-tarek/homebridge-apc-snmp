let snmp = require("net-snmp");

module.exports = (api) => {
    api.registerAccessory('ups', UPS);
};


class UPS {
    services = []

    getServices() {
        return this.services;
    }

    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.session = snmp.createSession(this.config.address, this.config.community);
        this.oids = {
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

        this.informationService = new this.Service.AccessoryInformation().setCharacteristic(
            this.Characteristic.Manufacturer, "APC"
        );
        this.informationService.getCharacteristic(this.Characteristic.Model).onGet(
            this.getModelHandler.bind(this)
        );
        this.informationService.getCharacteristic(this.Characteristic.SerialNumber).onGet(
            this.getSerialNumberHandler.bind(this)
        );
        this.informationService.getCharacteristic(this.Characteristic.FirmwareRevision).onGet(
            this.getFirmwareRevHandler.bind(this)
        );

        for (const [key, value] of Object.entries(this.oids)) {
            if (key === "model" || key === "serial_number" || key === "firmware_rev") {
                let logging = this.log;
                this.session.get([value], function (error, varbinds) {
                    if (error) {
                        logging.error(error);
                    } else if (snmp.isVarbindError(varbinds[0])) {
                        logging.error(snmp.varbindError(varbinds[0]));
                    } else {
                        switch (key) {
                            case "model":
                                logging("Model: " + varbinds[0].value.toString());
                                logging("Manufacturer: " + "APC");
                                return;
                            case "serial_number":
                                logging("Serial Number: " + varbinds[0].value.toString());
                                return;
                            case "firmware_rev":
                                logging("Firmware Rev.: " + varbinds[0].value.toString());
                                return;
                        }
                    }
                });
            }
        }

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
        this.switchService.getCharacteristic(this.Characteristic.On).onGet(this.getPowerStateHandler.bind(this)).onSet(
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

        this.selfTestSwitchService = new this.Service.Switch(this.name + " Self Test", "Self Test");
        this.selfTestSwitchService.getCharacteristic(this.Characteristic.On).onGet(
            this.getSelfTestHandler.bind(this)
        ).onSet(
            this.setSelfTestHandler.bind(this)
        );

        this.tempService = new this.Service.TemperatureSensor(this.name + " Temperature");
        this.tempService.getCharacteristic(this.Characteristic.CurrentTemperature).onGet(
            this.getTempHandler.bind(this)
        );

        this.services.push(this.informationService);
        if (!this.config.enable_non_graceful === false) {
            this.services.push(this.switchService);
        }
        if (!this.config.enable_graceful === false) {
            this.services.push(this.gracefulSwitchService)
        }
        if (!this.config.enable_alarm === false) {
            this.services.push(this.alarmSwitchService)
        }
        if (!this.config.enable_self_test === false) {
            this.services.push(this.selfTestSwitchService)
        }
        if (!this.config.enable_temp === false) {
            this.services.push(this.tempService)
        }
        if (!this.config.enable_battery === false) {
            this.services.push(this.batteryService)
        }
    }

    // Helper

    setSNMP(oid, type, value) {
        let logging = this.log;
        this.session.set([{oid, type, value}], function (error, varbinds) {
            if (error) {
                logging.error(error.toString());
                return null;
            }
            for (let i = 0; i < varbinds.length; i++) {
                if (snmp.isVarbindError(varbinds[i])) {
                    logging.error(snmp.varbindError(varbinds[i]));
                } else {
                    logging.info("Set " + varbinds[i].oid + " to value " + varbinds[i].value);
                }
            }
        });
    }

    async getSNMP(oid) {
        let logging = this.log;
        return await this.session.get([oid], function (error, varbinds) {
            if (error) {
                logging.error(error);
            } else if (snmp.isVarbindError(varbinds[0])) {
                logging.error(snmp.varbindError(varbinds[0]));
            } else {
                let val = varbinds[0].value.toString();
                logging.debug(val);
                return val;
            }
        });
    }

    // Self Test

    async getSelfTestHandler() {
        this.log.debug('Triggered GET setSelfTestHandler');
        return await this.getSNMP(this.oids.selftest_state) > 3;
    }

    async setSelfTestHandler(value) {
        this.log.debug('Triggered SET setSelfTestHandler');
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
        return temp ? temp : 0;
    }

    // Battery

    async getBatteryLevelHandler() {
        this.log.debug('Triggered GET getBatteryLevelHandler');
        let level = await this.getSNMP(this.oids.bat_capacity);
        return level ? level : 0;
    }

    async getLowBatteryHandler() {
        this.log.debug('Triggered GET getLowBatteryHandler');
        let status = await this.getSNMP(this.oids.bat_status);
        return status === 3 ? 1 : 0;
    }


    async getBatteryChargingStateHandler() {
        this.log.debug('Triggered GET getBatteryChargingStateHandler');
        return await this.getSNMP(this.oids.time_on_bat) === "0" ? 1 : 0;
    }

    // Stuff for information service

    async getModelHandler() {
        this.log.debug('Triggered GET getModelHandler');
        return await this.getSNMP(this.oids.model);
    }

    async getSerialNumberHandler() {
        this.log.debug('Triggered GET getSerialNumberHandler');
        return await this.getSNMP(that.oids.serial_number);
    }

    async getFirmwareRevHandler() {
        this.log.debug('Triggered GET getFirmwareRevHandler');
        return await this.getSNMP(that.oids.firmware_rev);
    }
}