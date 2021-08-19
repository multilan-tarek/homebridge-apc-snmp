#homebridge-apc-snmp
###Version 1.0.0
###APC UPS SNMP plugin for homebridge

#### **This is an early version! If you have any problems, feel free to open an issue.**
#### Tested with an APC SmartUPS 750 RM (SUA750RMI2U) with the AP9606 Web/SNMP Card


##How to get started
1. Install "homebridge-apc-snmp" using the web ui or "npm install homebridge-apc-snmp"
2. Create a new accessory config
3. Set the *accessory* setting to *ups*
4. Chose a name for your accessory using the *name* setting, for example *UPS*
5. Add *address* to the config and set it to your address of the snmp host, for example *10.0.30.3*
6. Add *community* to the config and set it to a community that has **write access**, for example *private*
7. Below are four config settings that enable the different switches
```json
"enable_non_graceful": true
"enable_graceful": true
"enable_alarm": true
"enable_selftest": true
```
8. Add one, two or all of them to your config (it's your decision here) They are explained below. Don't forget the json formatting (**comma**)
9. Now save the config and restart Homebridge
10. Hope for the best
11. Check the log for any errors, timeouts are okay (sometimes). If you have problems, open an issue.

##Config settings
```json
{
  "accessory": "ups",                   Must be this value
  "name": "UPS",                        Name of the accessory (your decision)
  "community": "private",               Name of the SNMP community
  "address": "10.0.30.3",               IP Address of the SNMP host
  "enable_non_graceful": true,          Enables switch for power on and off
  "enable_graceful": true,              Enables switch for power on and gracefully off
  "enable_alarm": true,                 Enables switch for alarm on and off
  "enable_selftest": true               Enabled switch to start a selftest
}
```