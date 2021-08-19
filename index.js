var snmp = require("net-snmp");


module.exports = (api) => {
    api.registerAccessory('ups', UPS);
};

class UPS {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.session = snmp.createSession("10.0.30.3", "public");
        this.oids = {
            "model": "1.3.6.1.4.1.318.1.1.1.1.1.1.0",
            "manufacturer": "APC",
            "serial_number": "1.3.6.1.4.1.318.1.1.1.1.2.3.0",
            "firmware_rev": "1.3.6.1.4.1.318.1.1.1.1.2.1.0",
        };

        this.log.debug('APC SNMP UPS plugin loaded');

        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;

        this.informationService = new this.api.hap.Service.AccessoryInformation()
            .setCharacteristic(this.api.hap.Characteristic.Manufacturer, "APC")
            .setCharacteristic(this.api.hap.Characteristic.Model, this.getFromSnmp(this.oids.model))
            .setCharacteristic(this.api.hap.Characteristic.Name, this.getFromSnmp(this.oids.model))
            .setCharacteristic(this.api.hap.Characteristic.SerialNumber, this.getFromSnmp(this.oids.serial_number))
            .setCharacteristic(this.api.hap.Characteristic.FirmwareRevision, this.getFromSnmp(this.oids.firmware_rev));

        this.batteryService = new this.Service(this.Service.Battery);
        this.batteryService.getCharacteristic(this.Characteristic.StatusLowBattery)
            .onGet(this.handleStatusLowBatteryGet.bind(this));

        // create a new "Switch" service
        this.switchService = new this.api.hap.Service.Switch(this.name);

        // link methods used when getting or setting the state of the service
        this.switchService.getCharacteristic(this.api.hap.Characteristic.On)
            .onGet(this.getOnHandler.bind(this))   // bind to getOnHandler method below
            .onSet(this.setOnHandler.bind(this));  // bind to setOnHandler method below
    }

    getFromSnmp(oid) {
        this.session.get([oid], function (error, varbinds) {
            if (error) {
                console.error(error);
            } else {
                for (let i = 0; i < varbinds.length; i++) {
                    if (snmp.isVarbindError (varbinds[i])) {
                        console.error (snmp.varbindError (varbinds[i]));
                    } else {
                        return varbinds[i].value;
                    }
                }
            }
        });
        return "-"
    }


    /**
     * REQUIRED - This must return an array of the services you want to expose.
     * This method must be named "getServices".
     */
    getServices() {
        return [
            this.informationService,
            this.batteryService,
            this.switchService,
        ];
    }

    handleStatusLowBatteryGet() {
        this.log.debug('Triggered GET StatusLowBattery');

        // set this to a valid value for StatusLowBattery
        const currentValue = this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

        return currentValue;
    }

    async getOnHandler() {
        this.log.info('Getting switch state');

        // get the current value of the switch in your own code
        const value = false;

        return value;
    }

    async setOnHandler(value) {
        this.log.info('Setting switch state to:', value);
    }


}