'use strict';
var snmp = require("net-snmp");

module.exports = (api) => {
    api.registerAccessory('ups', UPS);
};

class UPS {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.session = snmp.createSession("10.0.30.3", "private");
        this.oids = {
            "info": {
                "model": "1.3.6.1.4.1.318.1.1.1.1.1.1.0",
                "manufacturer": "1.3.6.1.4.1.318.1.1.1.1.1.1.0",
                "serial_number": "1.3.6.1.4.1.318.1.1.1.1.2.3.0",
                "firmware_rev": "1.3.6.1.4.1.318.1.1.1.1.2.1.0",
            },
            "turn_on": {"oid": "1.3.6.1.4.1.318.1.1.1.6.2.6.0", "type": snmp.ObjectType.INTEGER, "value": 2},
            "turn_off": {"oid": "1.3.6.1.4.1.318.1.1.1.6.2.1.0", "type": snmp.ObjectType.INTEGER, "value": 2}
        };


        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;

        let model = "";
        let serial_number = "";
        let firmware_rev = "";

        for (const [key, oid] of Object.entries(this.oids.info)) {
            this.session.get([oid], function (error, varbinds) {
                if (error) {
                    console.error(error);
                } else {
                    if (snmp.isVarbindError(varbinds[0])) {
                        console.error(snmp.varbindError(varbinds[0]));
                    } else {
                        if (key === "model") {
                            model = varbinds[0].value
                        } else if (key === "serial_number") {
                            serial_number = varbinds[0].value
                        } else if (key === "firmware_rev") {
                            firmware_rev = varbinds[0].value
                        }
                        console.log(varbinds[0].oid + "|" + varbinds[0].value);
                    }
                }
            });
        }

        this.log("UPS Info:");
        this.log("Model: " + model);
        this.log("Serial Number: " + serial_number);
        this.log("Firmware Rev.: " + firmware_rev);

        this.informationService = new this.api.hap.Service.AccessoryInformation()
            .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "APC")
            .setCharacteristic(this.api.hap.Characteristic.Model, model)
            .setCharacteristic(this.api.hap.Characteristic.Name, model)
            .setCharacteristic(this.api.hap.Characteristic.SerialNumber, serial_number)
            .setCharacteristic(this.api.hap.Characteristic.FirmwareRevision, firmware_rev);


        this.switchService = new this.api.hap.Service.Switch(model);

        // link methods used when getting or setting the state of the service
        this.switchService.getCharacteristic(this.api.hap.Characteristic.On)
            .onGet(this.getOnHandler.bind(this))   // bind to getOnHandler method below
            .onSet(this.setOnHandler.bind(this));  // bind to setOnHandler method below
    }


    setSnmp(oid, type, value) {
        this.session.set([{oid, type, value}], function (error, varbinds) {
            if (error) {
                console.error(error.toString());
                return false;
            } else {
                if (snmp.isVarbindError(varbinds[0])) {
                    console.error(snmp.varbindError(varbinds[0]));
                    return false;
                } else {
                    console.log(varbinds[0].oid + "|" + varbinds[0].value);
                    return true;
                }
            }
        });
    }


    /**
     * REQUIRED - This must return an array of the services you want to expose.
     * This method must be named "getServices".
     */
    getServices() {
        return [
            this.informationService,
            this.switchService,
        ];
    }

    async getOnHandler() {
        this.log.info('Getting switch state');

        // get the current value of the switch in your own code
        return false;
    }

    async setOnHandler(value) {
        if (value === true) {
            this.setSnmp(this.oids.turn_on.oid, this.oids.turn_on.type, this.oids.turn_on.value);
        } else {
            this.setSnmp(this.oids.turn_off.oid, this.oids.turn_off.type, this.oids.turn_off.value);
        }
    }


}