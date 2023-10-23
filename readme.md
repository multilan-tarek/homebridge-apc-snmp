# homebridge-apc-snmp
### APC UPS SNMP plugin for homebridge - Version 1.1.0
https://www.npmjs.com/package/homebridge-apc-snmp
#### **This is an early version!**
#### Tested with an APC SmartUPS 750 RM (SUA750RMI2U) with the AP9606 Web/SNMP Card


## How to get started
1. Install "homebridge-apc-snmp" using the Web UI or "npm install homebridge-apc-snmp"
2. Create a new accessory config entry
3. Set the *accessory* setting to *ups*
4. Choose a name for your accessory using the *name* setting, for example *UPS*
5. Add an *address* entry and set it to your address of the SNMP host, for example *10.0.30.3*
6. Add a *community* entry and set it to a community that has **write access**, for example *private*
7. (You can add multiple entries, if you have more than one UPS)
8. Save the config and restart Homebridge

## Config settings
```json
{
  "accessory": "ups",                   // Must be this value
  "name": "UPS",                        // Friendly name of the accessory
  "community": "private",               // Name of the SNMP community
  "address": "10.0.30.3",               // IP Address of the SNMP host
  "enable_non_graceful": true,          // Enables switch for power on and off
  "enable_graceful": true,              // Enables switch for power on and gracefully off
  "enable_alarm": true,                 // Enables switch for alarm on and off
  "enable_selftest": true,              // Enables switch to start a self test
  "enable_temp": true,                  // Enables temperature sensor service
  "enable_battery": true                // Enables battery service
}
```