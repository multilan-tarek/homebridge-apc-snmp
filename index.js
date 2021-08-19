module.exports = (api) => {
    api.registerAccessory('apc_snmp_ups', ApcSnmpUps);
};

class ApcSnmpUps {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;

        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;

        this.name = config.name;

        this.battery_service = new this.Service(this.Service.Battery);

        // create handlers for required characteristics
        this.battery_service.getCharacteristic(this.Characteristic.StatusLowBattery)
            .onGet(this.handleStatusLowBatteryGet.bind(this));

    }

    /**
     * Handle requests to get the current value of the "Status Low Battery" characteristic
     */
    handleStatusLowBatteryGet() {
        this.log.debug('Triggered GET StatusLowBattery');

        // set this to a valid value for StatusLowBattery
        return this.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
    }
}